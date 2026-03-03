import type { GameQuestion } from '../../game/core/types';
import { useGame } from '../../contexts/GameContext';

const getQuestionText = (question: GameQuestion): string => {
    switch (question.type) {
        case 'LOCATE_SINGLE':
            return question.target.name;
        case 'LOCATE_PAIR':
            return `${question.start.name} → ${question.end.name}`;
        case 'ESTIMATE_DIST':
            return `${question.start.name} → ${question.end.name}`;
        default:
            return '알 수 없는 문제';
    }
};

export const ActionBar = () => {
    const { gameState, currentQuestion, lastFeedback, isHintActive, setHintActive } = useGame();

    if (gameState !== 'PLAYING') return null;

    return (
        <div className="absolute top-20 left-4 glass-panel p-4 w-64 z-[35]">
            <h3 className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2 border-b border-white/10 pb-1">
                현재 문제
            </h3>

            {currentQuestion ? (
                <div className="flex items-center justify-between">
                    <p className="text-base font-bold text-white leading-snug">
                        {getQuestionText(currentQuestion)}
                    </p>
                    <button 
                        onClick={() => setHintActive(!isHintActive)}
                        className={`ml-2 px-2 py-1 text-xs font-bold rounded transition-colors ${isHintActive ? 'bg-yellow-500/20 text-yellow-500' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        🔍 찾기
                    </button>
                </div>
            ) : (
                <p className="text-sm text-gray-500 font-mono">준비 중...</p>
            )}

            {lastFeedback && (
                <div className={`
                    mt-2 pt-2 border-t border-white/10
                    text-sm font-mono font-bold text-center
                    ${lastFeedback.isCorrect ? 'text-green-500' : 'text-red-500'}
                `}>
                    {lastFeedback.isCorrect ? '✓ 정답!' : '✗ 오답'}
                </div>
            )}
        </div>
    );
};
