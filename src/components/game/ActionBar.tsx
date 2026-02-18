import { useGame } from '../../contexts/GameContext';

// Helper to generate question text based on type
const getQuestionText = (question: any) => {
    switch (question.type) {
        case 'LOCATE_SINGLE':
            return question.target.name;
        case 'LOCATE_PAIR':
            return `${question.start.name} ➡️ ${question.end.name}`;
        default:
            return '알 수 없는 문제';
    }
};

export const ActionBar = () => {
    const { gameState, currentQuestion, lastFeedback } = useGame();
    const isVisible = gameState === 'PLAYING';

    return (
        <div
            className={`
        absolute top-16 left-2 right-2 z-30
        glass-panel border-primary bg-primary
        py-6 px-8
        transition-transform duration-300 ease-out 
        ${isVisible ? 'translate-y-0' : '-translate-y-full'}
      `}
        >
            {/* Header Label */}
            <div className="text-[10px] text-primary/70 font-mono uppercase tracking-widest mb-2 border-b border-primary/20 pb-1 text-center w-full">
                상태 알림
            </div>

            {/* Question */}
            {currentQuestion && (
                <h2 className="text-2xl font-bold text-center text-foreground">
                    Q. 다음 지역을 찾으세요:
                    <span className="text-background ml-2">
                        {getQuestionText(currentQuestion)}
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
