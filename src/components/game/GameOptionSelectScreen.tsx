import { useMemo } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useGeoContext } from '../../contexts/GeoDataContext';

export const GameOptionSelectScreen = () => {
    const { startGame, setGameState } = useGame();
    const { cityData, filteredMapData } = useGeoContext();

    // 1단계: 시/군/구 추출 (Flat Level 2 List)
    // Level 2 데이터(skorea-municipalities-2018-geo.json) 전체를 가상의 묶음 없이 있는 그대로 노출합니다.
    const availableCities = useMemo(() => {
        if (!cityData) return [];

        const cityMap = new Map<string, { name: string, code: string }>();

        cityData.features.forEach(f => {
            const code = f.properties.code;
            if (!code.startsWith('41') && !code.startsWith('11') && !code.startsWith('23')) return;

            const name: string = f.properties.name || '';

            if (!cityMap.has(code)) {
                cityMap.set(code, { name, code });
            }
        });

        return Array.from(cityMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [cityData]);

    const handleCitySelect = (city: { code: string; name: string }) => {
        if (!filteredMapData) return;

        // 선택한 L2 지역(예: 41113 수원시 권선구)의 하위 L3 지역 추출
        const targetRegionsLevel3 = filteredMapData.features.filter(f => f.properties.code.startsWith(city.code));

        // 퀴즈 타겟: _isEmdGroup (동/읍/면 단위. '리' 제외)
        const targetDongs = targetRegionsLevel3.filter(f => (f as any).properties._isEmdGroup);

        startGame({
            chapterCode: city.code,
            overrideRegions: targetDongs,
            isBasicMode: false // 상세 모드(Level 3 타겟)로 바로 시작
        });
    };

    const handleBack = () => {
        setGameState('GAME_MODE_SELECT');
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
                            작전 지역(시/군/구) 선택
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
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {availableCities.map(city => (
                            <button
                                key={city.code}
                                onClick={() => handleCitySelect(city)}
                                className="p-4 text-center bg-slate-800/80 hover:bg-emerald-900/50 border border-slate-700 hover:border-emerald-500 rounded-xl transition-all font-bold text-slate-200 hover:text-emerald-300 hover:scale-105 active:scale-95 shadow-sm"
                            >
                                {city.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
