import { useMemo, useState, useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Button } from '../ui/Button';
import { MasteryStorage } from '../../services/MasteryStorage';

// 주요 도시 (우선순위 표시용 - 기획서 2.2)
// "실제 출동 빈도가 높거나 중요한 주요 도시"
const PRIORITY_CITIES = ['수원시', '성남시', '용인시', '고양시', '부천시', '화성시', '남양주시', '안산시'];

export const GameOptionSelectScreen = () => {
    const { mapDataLevel2, mapData: fullMapData, startGame, loading } = useGame();
    const { difficulty, setDifficulty, currentLevel, setCurrentLevel } = useSettings();

    const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
    const [masteryData, setMasteryData] = useState<Record<string, number>>({});

    // 초기 마스터리 데이터 로드
    useEffect(() => {
        const data = MasteryStorage.loadAllMastery();
        setMasteryData(data);
    }, []);

    // 난이도 변경 핸들러 (MasteryStorage에도 저장)
    const handleDifficultyChange = (newDifficulty: 'NORMAL' | 'HARD') => {
        setDifficulty(newDifficulty);
        MasteryStorage.saveDifficulty(newDifficulty);
    };

    // 시/군 (Chapter) 목록 데이터 가공
    const chapters = useMemo(() => {
        if (!mapDataLevel2 || !fullMapData) return [];

        // 1. Level 2 (시/군) 데이터에서 기본 정보 추출
        // Gyeonggi-do (41) filter is expected to be done in useGeoData or here.
        // Assuming mapDataLevel2 is already filtered for the target area (e.g. Gyeonggi).

        // Create a map of City Code -> City Name
        const cityMap = new Map<string, string>();
        mapDataLevel2.features.forEach(f => {
            // Code: 5 digits (e.g., 41110)
            if (f.properties.code && f.properties.name) {
                cityMap.set(f.properties.code, f.properties.name);
            }
        });

        // 2. Count sub-regions (Level 3 features) for each city
        const stats = new Map<string, number>();
        fullMapData.features.forEach(f => {
            // Level 3 code starts with Level 2 code (5 digits)
            const parentCode = f.properties.code?.substring(0, 5);
            if (parentCode && cityMap.has(parentCode)) {
                stats.set(parentCode, (stats.get(parentCode) || 0) + 1);
            }
        });

        // 3. Combine into Chapter objects
        return Array.from(cityMap.entries()).map(([code, name]) => {
            // Clean up name (e.g. "안산시 단원구" logic might be needed if Level 2 has Gu, but usually Level 2 is Si/Gun)
            // If Level 2 contains 'Gu' (e.g. Suwon-si Jangan-gu), we might want to group by 'Si' if the requirement is 'Si/Gun'.
            // GDD says: "31 Cities/Guns of Gyeonggi-do".

            const isPriority = PRIORITY_CITIES.some(p => name.includes(p));
            const mastery = masteryData[code] || 0;
            const subRegionCount = stats.get(code) || 0;

            return {
                code,
                name, // Display Name
                count: subRegionCount,
                mastery,
                isPriority
            };
            // Sort: Priority first, then Alphabetical
        }).sort((a, b) => {
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [mapDataLevel2, fullMapData, masteryData]);

    const handleStart = () => {
        if (!selectedChapter) return;
        startGame(selectedChapter); // Pass single chapter code
    };

    if (loading || !mapDataLevel2) return <div className="flex items-center justify-center h-full text-primary font-mono animate-pulse">LOADING MAP DATA...</div>;

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm p-4 animate-in fade-in duration-300">

            {/* 1. Level Selector (Header) */}
            <div className="w-full max-w-5xl flex items-center justify-between mb-8 px-4">
                <div className="flex items-center space-x-4">
                    <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic">
                        Mission Setup
                    </h1>
                    <div className="h-8 w-px bg-border" />
                    <div className="flex items-center space-x-2 bg-secondary/50 p-1 rounded-lg">
                        {/* Level Tab - Currently Fixed to Level 1 but expanding for future */}
                        {[1, 2, 3].map(lvl => (
                            <button
                                key={lvl}
                                onClick={() => setCurrentLevel(lvl)}
                                className={`
                  px-4 py-1.5 rounded-md text-sm font-bold transition-all
                  ${currentLevel === lvl
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-white/10'}
                `}
                            >
                                LEVEL {lvl}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Difficulty Toggle */}
                <div className="flex items-center space-x-3 bg-card border border-border px-4 py-2 rounded-full shadow-sm">
                    <span className={`text-sm font-bold ${difficulty === 'NORMAL' ? 'text-green-500' : 'text-muted-foreground'}`}>NORMAL</span>
                    <button
                        onClick={() => handleDifficultyChange(difficulty === 'NORMAL' ? 'HARD' : 'NORMAL')}
                        className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
              ${difficulty === 'HARD' ? 'bg-red-500' : 'bg-green-500'}
            `}
                    >
                        <span
                            className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${difficulty === 'HARD' ? 'translate-x-6' : 'translate-x-1'}
              `}
                        />
                    </button>
                    <span className={`text-sm font-bold ${difficulty === 'HARD' ? 'text-red-500' : 'text-muted-foreground'}`}>HARD</span>
                </div>
            </div>

            {/* 2. Main Content (Chapter Grid) */}
            <div className="w-full max-w-6xl flex-1 overflow-hidden flex flex-col glass-panel rounded-2xl border border-white/10 shadow-2xl">
                <div className="p-6 border-b border-border bg-black/20">
                    <h2 className="text-xl font-bold text-foreground flex items-center">
                        <span className="mr-2">🏳️</span> SELECT OPERATION AREA (CHAPTER)
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Select a specific City/Gun to master. Focus on one area at a time.
                    </p>
                </div>

                {/* Scrollable Grid */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {chapters.map(chapter => {
                            const isSelected = selectedChapter === chapter.code;
                            const isMastered = chapter.mastery === 100;
                            // Dimming Effect: If something is selected, dim others
                            const isDimmed = selectedChapter !== null && !isSelected;

                            return (
                                <button
                                    key={chapter.code}
                                    onClick={() => setSelectedChapter(chapter.code)}
                                    className={`
                    relative group flex flex-col items-start p-5 rounded-xl border text-left transition-all duration-300
                    ${isSelected
                                            ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-background z-10 scale-105'
                                            : 'border-border bg-card/50 hover:border-primary/50 hover:bg-card/80'}
                    ${isDimmed ? 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0' : 'opacity-100'}
                  `}
                                >
                                    {/* Priority Badge */}
                                    {chapter.isPriority && (
                                        <div className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">
                                            MAJOR
                                        </div>
                                    )}

                                    {/* Mastered Badge */}
                                    {isMastered && (
                                        <div className="absolute -top-2 -left-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg border border-white/20 flex items-center">
                                            <span>👑 MASTER</span>
                                        </div>
                                    )}

                                    <div className="mb-2">
                                        <h3 className={`font-bold text-lg leading-tight ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                            {chapter.name}
                                        </h3>
                                        <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                                            Code: {chapter.code}
                                        </div>
                                    </div>

                                    <div className="mt-auto w-full">
                                        <div className="flex justify-between items-end mb-1">
                                            <span className="text-xs font-mono text-muted-foreground">{chapter.count} Zones</span>
                                            <span className={`text-sm font-bold font-mono ${isMastered ? 'text-amber-500' : 'text-primary'}`}>
                                                {chapter.mastery}%
                                            </span>
                                        </div>
                                        {/* Progress Bar */}
                                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 ${isMastered ? 'bg-amber-500' : 'bg-primary'}`}
                                                style={{ width: `${chapter.mastery}%` }}
                                            />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 border-t border-border bg-black/20 flex flex-col items-center">
                    <Button
                        size="lg"
                        className="w-full max-w-md text-lg font-bold py-6 shadow-xl relative overflow-hidden group"
                        disabled={!selectedChapter}
                        onClick={handleStart}
                    >
                        {selectedChapter ? (
                            <>
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    START MISSION <span className="text-xs opacity-70 bg-black/20 px-1.5 py-0.5 rounded">⏎</span>
                                </span>
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            </>
                        ) : (
                            <span className="opacity-50">Select an Area to Begin</span>
                        )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-4 font-mono">
                        * Complete all zones in the area to achieve mastery status.
                    </p>
                </div>
            </div>
        </div>
    );
};
