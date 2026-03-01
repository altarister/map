import { useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useGeoContext } from '../../contexts/GeoDataContext';

interface Props {
    selectedCity: { code: string; isGuCity: boolean; name: string };
    onClose: () => void;
}

export const RegionModeSelectPopup = ({ selectedCity, onClose }: Props) => {
    const { startGame, setGameState } = useGame();
    const { fullMapData, cityData, filteredMapData, setFilteredMapData, setSelectedChapter } = useGeoContext();

    useEffect(() => {
        // Prevent click events from bubbling down to the map
        const handleInteraction = (e: MouseEvent | TouchEvent) => {
            e.stopPropagation();
        };
        const el = document.getElementById('region-mode-select-popup');
        if (el) {
            el.addEventListener('mousedown', handleInteraction);
            el.addEventListener('touchstart', handleInteraction);
        }
        return () => {
            if (el) {
                el.removeEventListener('mousedown', handleInteraction);
                el.removeEventListener('touchstart', handleInteraction);
            }
        };
    }, []);

    const handleModeSelect = (mode: 'BASIC' | 'DETAILED') => {
        const prefix = selectedCity.code.substring(0, 4);
        const targetRegionsLevel3 = filteredMapData?.features.filter(f => f.properties.code.startsWith(prefix)) || [];

        if (selectedCity.isGuCity) {
            // [Type A] 대도시 (구 존재)
            const guFeatures = cityData?.features
                .filter(f => f.properties.code.startsWith(prefix) && f.properties.name.endsWith('구'))
                .map(f => ({
                    ...f,
                    properties: {
                        ...f.properties,
                        name: f.properties.name.split('시').pop() || f.properties.name
                    }
                })) || [];

            console.log('[RegionModeSelectPopup] prefix:', prefix, 'isGuCity:', selectedCity.isGuCity);
            console.log('[RegionModeSelectPopup] guFeatures length:', guFeatures.length);
            if (guFeatures.length === 0) {
                console.warn('[RegionModeSelectPopup] No Gu features found for prefix', prefix, 'in cityData?', cityData?.features.length);
            }

            if (mode === 'BASIC') {
                startGame({
                    chapterCode: selectedCity.code,
                    overrideRegions: guFeatures,
                    isBasicMode: true
                });
            } else if (mode === 'DETAILED') {
                // [NEW] 3-Depth Map-First UX: Show Gu polygons instead of Dongs
                setSelectedChapter(selectedCity.code);
                setFilteredMapData({ ...fullMapData!, features: guFeatures });
                setGameState('SUBREGION_SELECT');
            }
        } else {
            // [Type B] 일반 도농복합 시군 (Gu 생략)
            if (mode === 'BASIC') {
                const emdFeatures = targetRegionsLevel3.filter(f => (f as any).properties._isEmdGroup);
                startGame({
                    chapterCode: selectedCity.code,
                    overrideRegions: emdFeatures,
                    isBasicMode: true
                });
            } else if (mode === 'DETAILED') {
                // [NEW] 3-Depth Map-First UX: Show Eup/Myeon/Dong polygons instead of Ris
                const emdAndDongFeatures = targetRegionsLevel3.filter(f =>
                    (f as any).properties._isEmdGroup || f.properties.name.endsWith('동')
                );
                setSelectedChapter(selectedCity.code);
                setFilteredMapData({ ...fullMapData!, features: emdAndDongFeatures });
                setGameState('SUBREGION_SELECT');
            }
        }
        // Retain selectedRegionForMode for Retry flow (do not clear it here)
    };

    return (
        <div
            id="region-mode-select-popup"
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-in fade-in zoom-in-95 duration-200"
        >
            <div className="w-[480px] p-6 bg-slate-900/95 border border-emerald-500/50 rounded-2xl shadow-2xl backdrop-blur-md">

                <div className="flex justify-between items-center mb-6 border-b border-emerald-500/30 pb-3">
                    <h2 className="text-xl font-bold text-slate-200">
                        <span className="text-emerald-400 font-black mr-2">[{selectedCity.name}]</span>
                        훈련 코스 선택
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-red-400 font-mono text-sm px-2 py-1 rounded transition-colors"
                    >
                        [ CLOSE ]
                    </button>
                </div>

                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => handleModeSelect('BASIC')}
                        className="group w-full p-5 bg-slate-800/80 hover:bg-emerald-900/40 border-2 border-slate-700 hover:border-emerald-500 rounded-xl transition-all shadow-md text-left"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-bold text-slate-200 group-hover:text-emerald-400">기본 코스 <span className="text-xs font-normal text-slate-400 ml-2">NORMAL</span></h3>
                            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 font-mono text-[10px] rounded">RECOMMENDED</span>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300">
                            해당 지역의 뼈대(구/읍/면 단위)를 학습합니다. 복잡한 경계선은 숨겨집니다.
                        </p>
                    </button>

                    <button
                        onClick={() => handleModeSelect('DETAILED')}
                        className="group w-full p-5 bg-slate-800/80 hover:bg-amber-900/40 border-2 border-slate-700 hover:border-amber-500 rounded-xl transition-all shadow-md text-left"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-bold text-slate-200 group-hover:text-amber-400">상세 코스 <span className="text-xs font-normal text-slate-400 ml-2">EXPERT</span></h3>
                            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 font-mono text-[10px] rounded">VETERAN</span>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300">
                            지역 안으로 깊게 진입하여 가장 작은 단위(동/리)를 마스터합니다.
                        </p>
                    </button>
                </div>
            </div>
        </div>
    );
};
