
import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';

export const GameModeSelectScreen = () => {
    const { setGameState } = useGame();
    const { theme } = useSettings();

    const isTactical = theme === 'tactical';

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="flex flex-col items-start gap-6 max-w-4xl w-full px-8">

                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic shadow-black drop-shadow-md">
                        <span className="text-primary mr-2">///</span>작전 유형 선택
                    </h1>
                    <p className="text-gray-400 font-mono text-sm">
                        수행할 훈련 작전의 유형을 선택하십시오.
                    </p>
                </div>

                {/* Mode Cards Container */}
                <div className="grid grid-cols-1 gap-6 w-full max-w-lg">

                    {/* Mode 1: Region Mastery */}
                    <button
                        onClick={() => setGameState('LEVEL_SELECT')}
                        className={`
              group relative flex flex-col items-start p-6 rounded-xl border-l-4 transition-all duration-300
              ${isTactical
                                ? 'bg-slate-900/90 border-emerald-500 hover:bg-slate-800 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                                : 'bg-white border-blue-500 hover:bg-blue-50 shadow-lg'}
            `}
                    >
                        <div className="flex justify-between w-full items-center mb-2">
                            <h2 className={`text-2xl font-bold ${isTactical ? 'text-emerald-400' : 'text-blue-600'}`}>
                                1단계: 지역 숙달
                            </h2>
                            <span className={`text-xs font-mono px-2 py-1 rounded ${isTactical ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-100 text-blue-600'}`}>
                                R O O K I E
                            </span>
                        </div>

                        <p className="text-gray-300 text-sm text-left mb-4 leading-relaxed">
                            시/군/구 단위로 하나씩 선택하여 집중적으로 위치를 암기합니다.<br />
                            <span className="text-gray-500 text-xs">"초보자에게 권장되는 기본 훈련 코스입니다."</span>
                        </p>

                        <div className={`mt-auto w-full h-px ${isTactical ? 'bg-emerald-500/30' : 'bg-blue-200'} group-hover:bg-emerald-500 transition-colors`} />

                        <div className="absolute right-6 bottom-6 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 text-emerald-500">
                            ▶
                        </div>
                    </button>

                    {/* Mode 2: Locked */}
                    <div className="relative flex flex-col items-start p-6 rounded-xl border-l-4 border-gray-700 bg-gray-900/50 opacity-60 cursor-not-allowed grayscale">
                        <div className="flex justify-between w-full items-center mb-2">
                            <h2 className="text-2xl font-bold text-gray-500">
                                2단계: 종합 평가
                            </h2>
                            <span className="text-xs font-mono px-2 py-1 rounded bg-gray-800 text-gray-500">
                                L O C K E D
                            </span>
                        </div>
                        <p className="text-gray-500 text-sm text-left">
                            경기도 전체를 대상으로 무작위 훈련을 진행합니다.<br />
                            <span className="text-xs text-gray-600">"1단계 숙달 후 해금됩니다."</span>
                        </p>
                    </div>

                </div>

            </div>
        </div>
    );
};
