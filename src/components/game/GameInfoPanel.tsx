
import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';

export const GameInfoPanel = () => {
    const { gameState, score, currentStage } = useGame();
    const { showGameInfo, topScore } = useSettings();

    // Hide in separate screens or if toggled off
    if (!showGameInfo || gameState === 'INITIAL') return null;

    return (
        <div className="absolute bottom-14 left-4 glass-panel p-4 w-64 z-[35] pointer-events-none">
            <h3 className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2 border-b border-white/10 pb-1">게임 로그</h3>
            <div className="text-xs font-mono space-y-1 text-gray-300">
                <div className="flex justify-between">
                    <span className="text-gray-500">레벨:</span>
                    <span>{currentStage || '-'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">상태:</span>
                    <span className={gameState === 'PLAYING' ? 'text-green-500' : 'text-gray-300'}>
                        {gameState === 'PLAYING' ? '진행중' : gameState}
                    </span>
                </div>
                {/* 시스템 상태 요약 */}
                <div className="flex justify-between mt-2 pt-2 border-t border-white/10">
                    <span className="text-gray-500">최고기록:</span>
                    <span className="text-gray-300 font-bold">{topScore.toString().padStart(4, '0')}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">현재점수:</span>
                    <span className={`font-bold ${gameState === 'PLAYING' ? 'text-green-500' : 'text-gray-400'}`}>
                        {(score.correct * 100).toString().padStart(4, '0')}
                    </span>
                </div>

                {gameState === 'PLAYING' && (
                    <>
                        <div className="flex justify-between mt-2 pt-2 border-t border-white/10">
                            <span className="text-gray-500">정답:</span>
                            <span className="text-green-500 font-bold">{score.correct}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">오답:</span>
                            <span className="text-red-500 font-bold">{score.incorrect}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
