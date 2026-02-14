import { useGame } from '../../contexts/GameContext';

export const ActionBar = () => {
    const { gameState, currentQuestion, lastFeedback } = useGame();
    const isVisible = gameState === 'PLAYING';

    return (
        <div
            className={`
        absolute top-16 left-0 right-0 z-30
        glass-panel border-b-2 border-primary 
        py-6 px-8
        transition-transform duration-300 ease-out
        ${isVisible ? 'translate-y-0' : '-translate-y-full'}
      `}
        >
            {/* Question */}
            {currentQuestion && (
                <h2 className="text-2xl font-bold text-center text-foreground">
                    Q. 다음 지역을 찾으세요:
                    <span className="text-primary ml-2">
                        {currentQuestion.type === 'LOCATE_SINGLE' ? currentQuestion.target.name : '-'}
                    </span>
                </h2>
            )}

            {/* Feedback */}
            {lastFeedback && (
                <p className={`
          text-center mt-4 font-mono text-sm
          ${lastFeedback.isCorrect ? 'text-primary' : 'text-destructive'}
        `}>
                    {lastFeedback.isCorrect
                        ? '✓ 정답입니다!'
                        : '✗ 틀렸습니다. 다시 시도하세요'}
                </p>
            )}
        </div>
    );
};
