import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';
import { MasteryStorage } from '../../services/MasteryStorage';

export const GameOptionSelectScreen = () => {
    const { mapDataLevel2, loading } = useGame();
    const { difficulty, setDifficulty, currentLevel, setCurrentLevel } = useSettings();

    // 난이도 변경 핸들러 (MasteryStorage에도 저장)
    const handleDifficultyChange = (newDifficulty: 'NORMAL' | 'HARD') => {
        setDifficulty(newDifficulty);
        MasteryStorage.saveDifficulty(newDifficulty);
    };

    if (loading || !mapDataLevel2) return <div className="flex items-center justify-center h-full text-primary font-mono animate-pulse">LOADING MAP DATA...</div>;

    return (
        <div className="absolute inset-0 z-40 flex flex-col justify-between p-4 pointer-events-none">
            {/* 1. Level Selector (Header) - Enable Pointer Events */}
            <div className="w-full flex items-center justify-between mb-8 px-4 pointer-events-auto">
                <div className="flex items-center space-x-4">
                    <div className="flex flex-col">
                        <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic shadow-black drop-shadow-md">
                            작전 설정
                        </h1>
                        <span className="text-xs text-muted-foreground font-mono">MAP INTERACTIVE MODE</span>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div className="flex items-center space-x-2 bg-background/80 backdrop-blur p-1 rounded-lg border border-white/10 shadow-lg">
                        {/* Level Tab */}
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
                                레벨 {lvl}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Difficulty Toggle */}
                <div className="flex items-center space-x-3 bg-background/80 backdrop-blur border border-white/10 px-4 py-2 rounded-full shadow-lg pointer-events-auto">
                    <span className={`text-sm font-bold ${difficulty === 'NORMAL' ? 'text-green-500' : 'text-muted-foreground'}`}>일반</span>
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
                    <span className={`text-sm font-bold ${difficulty === 'HARD' ? 'text-red-500' : 'text-muted-foreground'}`}>어려움</span>
                </div>
            </div>

            {/* 2. Center Area - Empty to let Map show through */}
            <div className="flex-1 flex items-center justify-center">
                {/* Optional: Crosshair or Guide */}
                <div className="text-white/50 animate-pulse text-lg font-black uppercase tracking-[0.5em] pointer-events-none drop-shadow-lg">
                    작전 지역을 선택하십시오
                </div>
            </div>

            {/* 3. Footer / Instructions */}
            <div className="w-full flex justify-center pb-8 pointer-events-auto">
                <div className="bg-black/60 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/10 text-center shadow-2xl">
                    <p className="text-lg font-bold text-white mb-1">
                        <span className="text-primary">지도</span>를 직접 클릭하여 작전을 시작하세요.
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                        * 마우스를 올리면 지역 정보를 확인할 수 있습니다.
                    </p>
                </div>
            </div>
        </div>
    );
};
