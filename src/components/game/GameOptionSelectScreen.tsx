import { useState, useMemo } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useGeoContext } from '../../contexts/GeoDataContext';

type SelectionStep = 1 | 2;
type ModeSelection = 'BASIC' | 'DETAILED' | 'ALL' | null;

export const GameOptionSelectScreen = () => {
    const { startGame, setGameState } = useGame();
    const { cityData, filteredMapData } = useGeoContext();

    const [step, setStep] = useState<SelectionStep>(1);
    const [selectedCity, setSelectedCity] = useState<{ code: string; isGuCity: boolean; name: string } | null>(null);

    // 1단계: 시/군 추출
    // Level 2 데이터(skorea-municipalities-2018-geo.json)에는 '수원시장안구', '고양시일산동구' 처럼 구 단위로 폴리곤이 쪼개져 있음.
    // 지역 선택 화면에서는 이를 '수원시', '고양시' 1개의 버튼으로 묶어서 보여줘야 함.
    const gyeonggiCities = useMemo(() => {
        if (!cityData) return [];

        const cityMap = new Map<string, { name: string, code: string, isGuCity: boolean }>();

        cityData.features.forEach(f => {
            const code = f.properties.code;
            if (!code.startsWith('41')) return;

            const fullName: string = f.properties.name || '';
            let displayName = fullName;
            let groupCode = code;
            let isGuCity = false;

            // '수원시장안구' -> '수원시' 추출
            if (fullName.includes('시') && fullName.endsWith('구')) {
                const siIndex = fullName.indexOf('시') + 1;
                displayName = fullName.substring(0, siIndex);
                groupCode = code.substring(0, 4); // 부모 시 코드는 보통 앞 4자리로 묶임 (e.g. 4111)
                isGuCity = true;
            }

            if (!cityMap.has(displayName)) {
                cityMap.set(displayName, { name: displayName, code: groupCode, isGuCity });
            } else {
                if (isGuCity) cityMap.get(displayName)!.isGuCity = true;
            }
        });

        return Array.from(cityMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [cityData]);

    const handleCitySelect = (city: { code: string; isGuCity: boolean; name: string }) => {
        setSelectedCity(city);
        setStep(2);
    };

    const handleModeSelect = (mode: ModeSelection) => {
        if (!selectedCity) return;

        const prefix = selectedCity.code.substring(0, 4);
        const targetRegionsLevel3 = filteredMapData?.features.filter(f => f.properties.code.startsWith(prefix)) || [];

        if (selectedCity.isGuCity) {
            // [Type A] 대도시 (구 존재)
            // 상위 구 단위의 GeoJSON 피처들을 cityData(Level 2)에서 추출 후 라벨링용 이름 축약 처리
            const guFeatures = cityData?.features
                .filter(f => f.properties.code.startsWith(prefix) && f.properties.name.endsWith('구'))
                .map(f => ({
                    ...f,
                    properties: {
                        ...f.properties,
                        name: f.properties.name.split('시').pop() || f.properties.name // "수원시권선구" -> "권선구"
                    }
                })) || [];

            if (mode === 'BASIC') {
                startGame({
                    chapterCode: selectedCity.code,
                    overrideRegions: guFeatures,
                    isBasicMode: true
                });
            } else if (mode === 'DETAILED') {
                // 상세 모드: '동' 단위 (Level 3에서 '리'가 아닌 '동'으로 끝나는 부분)
                const dongFeatures = targetRegionsLevel3.filter(f => f.properties.name.endsWith('동'));
                startGame({
                    chapterCode: selectedCity.code,
                    overrideRegions: dongFeatures,
                    highlightRegions: guFeatures, // 워터마크
                    isBasicMode: false
                });
            } else if (mode === 'ALL') {
                const allFeatures = targetRegionsLevel3.filter(f => f.properties.name.endsWith('동') || !(f as any).properties._isEmdGroup);
                startGame({
                    chapterCode: selectedCity.code,
                    overrideRegions: allFeatures,
                    highlightRegions: guFeatures,
                    isBasicMode: false
                });
            }
        } else {
            // [Type B] 일반 도농복합 시/군
            if (mode === 'BASIC') {
                // VWorld 리(Ri) 단위 폴리곤들을 모두 병합한 '_isEmdGroup' 폴리곤들만 선택
                const emdFeatures = targetRegionsLevel3.filter(f => (f as any).properties._isEmdGroup);

                startGame({
                    chapterCode: selectedCity.code,
                    overrideRegions: emdFeatures,
                    isBasicMode: true
                });
            } else if (mode === 'DETAILED') {
                // 상세 코스는 쪼개진 원본 '리' 단위들 + 분할되지 않는 '동' 단위들을 같이 플레이함
                const targetRis = targetRegionsLevel3.filter(f =>
                    !(f as any).properties._isEmdGroup || f.properties.name.endsWith('동')
                );
                // 읍/면 워터마크 라벨과 굵은 테두리
                const emdFeatures = targetRegionsLevel3.filter(f => (f as any).properties._isEmdGroup && !f.properties.name.endsWith('동'));

                startGame({
                    chapterCode: selectedCity.code,
                    overrideRegions: targetRis,
                    highlightRegions: emdFeatures,
                    isBasicMode: false
                });
            } else if (mode === 'ALL') {
                const targetRis = targetRegionsLevel3.filter(f =>
                    !(f as any).properties._isEmdGroup || f.properties.name.endsWith('동')
                );
                const emdFeatures = targetRegionsLevel3.filter(f => (f as any).properties._isEmdGroup && !f.properties.name.endsWith('동'));

                startGame({
                    chapterCode: selectedCity.code,
                    overrideRegions: targetRis,
                    highlightRegions: emdFeatures,
                    isBasicMode: false
                });
            }
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep((s) => (s - 1) as SelectionStep);
        } else {
            setGameState('GAME_MODE_SELECT');
        }
    };

    if (!cityData) return null;

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 pointer-events-auto">
            <div className="w-full max-w-4xl p-8 bg-slate-900/90 border-2 border-slate-700/50 rounded-2xl shadow-2xl backdrop-blur-lg flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between mb-8 border-b border-emerald-500/30 pb-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-emerald-400 tracking-tight uppercase flex items-center">
                            <span className="text-emerald-500 mr-3">///</span> 지역 훈련 스코프 설정
                        </h1>
                        <p className="text-slate-400 font-mono text-sm ml-8">
                            STEP 0{step} - {step === 1 ? '작전 지역(시/군) 선택' : '전술 모드 선택'}
                        </p>
                    </div>
                    <button
                        onClick={handleBack}
                        className="px-4 py-2 text-sm font-mono text-emerald-500 hover:bg-emerald-500/10 rounded transition-colors border border-emerald-500/50"
                    >
                        [ BACK ]
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">

                    {step === 1 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {gyeonggiCities.map(city => (
                                <button
                                    key={city.code}
                                    onClick={() => handleCitySelect(city)}
                                    className="p-4 text-center bg-slate-800/80 hover:bg-emerald-900/50 border border-slate-700 hover:border-emerald-500 rounded-xl transition-all font-bold text-slate-200 hover:text-emerald-300 hover:scale-105 active:scale-95 shadow-sm"
                                >
                                    {city.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex flex-col gap-6 max-w-2xl mx-auto h-full justify-center">
                            <button
                                onClick={() => handleModeSelect('BASIC')}
                                className="group p-8 bg-slate-800/80 hover:bg-emerald-900/40 border-2 border-slate-600 hover:border-emerald-500 rounded-2xl transition-all shadow-lg text-left"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-black text-slate-200 group-hover:text-emerald-400">기본 코스 <span className="text-sm font-normal text-slate-400 ml-2">NORMAL</span></h2>
                                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 font-mono text-xs rounded">RECOMMENDED</span>
                                </div>
                                <p className="text-slate-400 leading-relaxed group-hover:text-slate-300">
                                    선택한 시/군의 넓은 **읍·면·동** 단위 영역들을 맞추며 뼈대를 학습합니다. 리(Ri) 단위의 복잡한 경계선은 무시됩니다.
                                </p>
                            </button>

                            <button
                                onClick={() => handleModeSelect('DETAILED')}
                                className="group p-8 bg-slate-800/80 hover:bg-amber-900/40 border-2 border-slate-600 hover:border-amber-500 rounded-2xl transition-all shadow-lg text-left"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-black text-slate-200 group-hover:text-amber-400">상세 코스 <span className="text-sm font-normal text-slate-400 ml-2">EXPERT</span></h2>
                                    <span className="px-3 py-1 bg-amber-500/20 text-amber-400 font-mono text-xs rounded">VETERAN</span>
                                </div>
                                <p className="text-slate-400 leading-relaxed group-hover:text-slate-300">
                                    특정 지역(하나의 읍/면) 안으로 깊게 파고들어, **세부 법정리(Ri)** 단위의 소규모 구역들을 완벽히 암기합니다.
                                </p>
                            </button>

                            <button
                                onClick={() => handleModeSelect('ALL')}
                                className="group p-8 bg-slate-800/80 hover:bg-purple-900/40 border-2 border-slate-600 hover:border-purple-500 rounded-2xl transition-all shadow-lg text-left"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-black text-slate-200 group-hover:text-purple-400">모든 코스 <span className="text-sm font-normal text-slate-400 ml-2">ALL</span></h2>
                                    <span className="px-3 py-1 bg-purple-500/20 text-purple-400 font-mono text-xs rounded">HARDCORE</span>
                                </div>
                                <p className="text-slate-400 leading-relaxed group-hover:text-slate-300">
                                    해당 시/군의 넓은 읍·면·동은 물론 가장 작은 법정리 단위의 구역들까지 한 번에 출제합니다. 가장 험난한 도전입니다!
                                </p>
                            </button>
                        </div>
                    )}



                </div>
            </div>
        </div>
    );
};
