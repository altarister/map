import { useMemo } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useGeoContext } from '../../contexts/GeoDataContext';
import { SELECTION_LEVEL_LABEL } from '../../types/region';

export const GameOptionSelectScreen = () => {
    const { 
        startGame, 
        setGameState, 
        selectionLevel, 
        setSelectionLevel, 
        currentFocusCode, 
        setCurrentFocusCode 
    } = useGame();
    const { level1Data, cityData, rawCityData, fullMapData } = useGeoContext();

    const availableOptions = useMemo(() => {
        if (selectionLevel === 'PROVINCE') {
            if (!level1Data) return [];
            return level1Data.features.map((f: any) => ({ name: f.properties.name, code: f.properties.code }));
        }
        
        if (selectionLevel === 'CITY') {
            // 2단계: 시/군/자치구
            if (!cityData) return [];
            const prefix = currentFocusCode ? currentFocusCode.substring(0, 2) : '';
            const filtered = cityData.features.filter((f: any) => f.properties.code.startsWith(prefix));

            const cityMap = new Map<string, { name: string, code: string }>();
            filtered.forEach((f: any) => {
                let code = f.properties.code;
                let name = f.properties.name || '';
                const match = name.match(/^(.*?시)[\s]*([\w\u3131-\uD79D]*구)$/);
                if (match) {
                    name = match[1]; // 상위 '시' 명칭 사용
                    code = code.substring(0, 4) + '0'; // 앞 4자리로 묶어 그룹 대표 코드 부여
                }
                if (!cityMap.has(code)) cityMap.set(code, { name, code });
            });
            return Array.from(cityMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        }

        if (selectionLevel === 'DISTRICT') {
            // 3단계: 일반구
            if (!rawCityData) return [];
            const prefix = currentFocusCode ? currentFocusCode.substring(0, 4) : '';
            const filtered = rawCityData.features.filter((f: any) => {
                const code = f.properties.code;
                return code.startsWith(prefix) && code.length === 5 && (!code.endsWith('0') || !code.startsWith('41'));
            });
            return filtered.map((f: any) => ({ name: f.properties.name, code: f.properties.code })).sort((a, b) => a.name.localeCompare(b.name));
        }

        return [];
    }, [selectionLevel, currentFocusCode, level1Data, cityData, rawCityData]);

    const handleSelect = (item: { code: string; name: string }) => {
        if (!fullMapData) return;

        if (selectionLevel === 'PROVINCE') {
            setCurrentFocusCode(item.code);
            setSelectionLevel('CITY');
            return;
        }

        if (selectionLevel === 'CITY') {
            const hasSubDistricts = item.code.startsWith('41') && rawCityData?.features.some((f: any) => 
                f.properties.code.startsWith(item.code.substring(0, 4)) && 
                f.properties.code.length === 5 && 
                !f.properties.code.endsWith('0')
            );

            if (hasSubDistricts && item.code.endsWith('0')) {
                setCurrentFocusCode(item.code);
                setSelectionLevel('DISTRICT');
                return;
            }

            const filterPrefix = item.code.endsWith('0') ? item.code.substring(0, 4) : item.code;
            const targetDongs = fullMapData.features.filter((f: any) => f.properties.code.startsWith(filterPrefix) && (f.properties as any)._isEmdGroup);
            startGame({ chapterCode: item.code, overrideRegions: targetDongs, isBasicMode: false });
            return;
        }

        if (selectionLevel === 'DISTRICT') {
            const targetDongs = fullMapData.features.filter((f: any) => f.properties.code.startsWith(item.code) && (f.properties as any)._isEmdGroup);
            startGame({ chapterCode: item.code, overrideRegions: targetDongs, isBasicMode: false });
            return;
        }
    };

    const handleBack = () => {
        if (selectionLevel === 'DISTRICT') {
            setSelectionLevel('CITY');
            setCurrentFocusCode(currentFocusCode ? currentFocusCode.substring(0, 2) : null);
        } else if (selectionLevel === 'CITY') {
            setSelectionLevel('PROVINCE');
            setCurrentFocusCode(null);
        } else {
            setGameState('GAME_MODE_SELECT');
        }
    };

    if (!fullMapData) return null;

    return (
        <div className="absolute inset-y-0 right-0 z-50 w-full max-w-sm flex flex-col bg-slate-900/80 border-l border-slate-700/50 shadow-2xl backdrop-blur-md animate-in slide-in-from-right duration-300 pointer-events-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-500/30">
            <div className="space-y-1">
                <h1 className="text-xl font-black text-emerald-400 tracking-tight uppercase flex text-left">
                    작전 지역 선택
                </h1>
                <p className="text-slate-400 font-mono text-xs">
                    {SELECTION_LEVEL_LABEL[selectionLevel]}
                </p>
            </div>
            <button
                onClick={handleBack}
                className="px-3 py-1.5 text-xs font-mono text-emerald-500 hover:bg-emerald-500/10 rounded transition-colors border border-emerald-500/50"
            >
                [ BACK ]
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="grid grid-cols-1 gap-2">
                {availableOptions.map(item => (
                    <button
                        key={item.code}
                        onClick={() => handleSelect(item)}
                        className="p-3 text-left bg-slate-800/80 hover:bg-emerald-900/50 border border-slate-700 hover:border-emerald-500 rounded-lg transition-all font-bold text-slate-200 hover:text-emerald-300 hover:scale-[1.02] active:scale-95 shadow-sm"
                    >
                        {item.name}
                    </button>
                ))}
            </div>
        </div>
    </div>
    );
};
