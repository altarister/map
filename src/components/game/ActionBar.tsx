import type { GameQuestion, UserInput } from '../../game/core/types';
import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useMemo } from 'react';
import { getIntelForRegion } from '../../data/regionIntelDB';
import { RegionIntelCard } from './RegionIntelCard';

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
    const { gameState, currentQuestion, lastFeedback, isHintActive, setHintActive, checkAnswer, levelState, skipQuestion, score, totalQuestions } = useGame();
    const { viewOptions } = useSettings();

    if (gameState !== 'PLAYING') return null;

    const handleAutoCorrect = () => {
        if (!currentQuestion) return;

        if (currentQuestion.type === 'LOCATE_SINGLE') {
            const input: UserInput = { type: 'MAP_CLICK', regionCode: currentQuestion.target.code };
            checkAnswer(input);
        } else if (currentQuestion.type === 'LOCATE_PAIR') {
            // 상차지가 아직 안 찍혔으면 start 먼저, 찍혔으면 end 처리
            const needStart = !levelState?.startCode;
            const input: UserInput = {
                type: 'MAP_CLICK',
                regionCode: needStart ? currentQuestion.start.code : currentQuestion.end.code,
            };
            checkAnswer(input);
        }
    };

    // 타겟 지역의 인텔 정보 유추
    const targetIntel = useMemo(() => {
        if (!currentQuestion) return null;
        const code = currentQuestion.type === 'LOCATE_SINGLE' 
            ? currentQuestion.target.code 
            : currentQuestion.type === 'LOCATE_PAIR' && !levelState?.startCode 
                ? currentQuestion.start.code 
                : currentQuestion.type === 'LOCATE_PAIR' && levelState?.startCode 
                    ? currentQuestion.end.code
                    : null;
        
        return code ? getIntelForRegion(code) : null;
    }, [currentQuestion, levelState?.startCode]);

    // 인텔 카드 노출 여부: 설정에서 켜져 있거나, (설정이 꺼져있어도) 힌트 켬 OR 오답/스킵 피드백 떴을 때
    const shouldShowIntel = viewOptions.showIntelCard || isHintActive || (lastFeedback && !lastFeedback.isCorrect);

    return (
        <>
        {/* 기존 Action Bar - 왼쪽 */}
        <div className="absolute top-20 left-4 z-[35]">
            <div className="glass-panel p-4 w-64 h-fit">

                {/* 헤더: 레이블 + 정답 버튼 */}
            <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-1">
                <h3 className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                    현재 문제
                </h3>
                <button
                    onClick={handleAutoCorrect}
                    className="px-2 py-0.5 text-xs font-bold rounded transition-colors bg-green-500/20 text-green-400 hover:bg-green-500/40"
                    title="정답 자동 처리"
                >
                    ✓ 정답
                </button>
            </div>

            {/* 본문: 문제 텍스트 + 찾기 버튼 */}
            {currentQuestion ? (
                <div className="flex flex-col gap-2">
                    <p className="text-base font-bold text-white leading-snug">
                        {getQuestionText(currentQuestion)}
                    </p>
                    <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-[10px] text-gray-400 font-mono">
                                푼 문제: <strong className="text-white">{score.correct + score.incorrect}</strong> / {totalQuestions || '-'}
                            </span>
                            <div className="flex gap-2 text-[10px] font-mono">
                                <span className="text-green-400">맞: {score.correct}</span>
                                <span className="text-red-400">틀: {score.incorrect}</span>
                            </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden flex">
                            {totalQuestions > 0 && (
                                <>
                                    <div 
                                        className="h-full bg-green-500 transition-all duration-300"
                                        style={{ width: `${(score.correct / totalQuestions) * 100}%` }}
                                    />
                                    <div 
                                        className="h-full bg-red-500 transition-all duration-300"
                                        style={{ width: `${(score.incorrect / totalQuestions) * 100}%` }}
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1 border-t border-white/10 pt-2 mt-2">
                        <button
                            onClick={() => setHintActive(!isHintActive)}
                            className={`flex-1 px-2 py-1 text-xs font-bold rounded transition-colors ${isHintActive ? 'bg-yellow-500/20 text-yellow-500' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                            🔍 찾기
                        </button>
                        <button
                            onClick={skipQuestion}
                            className="flex-1 px-2 py-1 text-xs font-bold rounded transition-colors bg-red-500/20 text-red-400 hover:bg-red-500/40"
                            title="오답 처리 후 다음 문제"
                        >
                            ⏭ 다음
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-gray-500 font-mono">준비 중...</p>
            )}

            {/* 피드백 */}
            {lastFeedback && (
                <div className={`mt-2 pt-2 border-t border-white/10 text-sm font-mono font-bold text-center ${lastFeedback.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                    {lastFeedback.isCorrect ? '✓ 정답!' : '✗ 오답'}
                </div>
            )}
            </div>
        </div>

        {/* 인텔 카드 (오른쪽 화면 끝에 별도 배치) */}
        {shouldShowIntel && targetIntel && (
            <div className="absolute top-20 right-4 z-[35] w-64 animate-in fade-in slide-in-from-right-4 duration-300 h-fit">
                <RegionIntelCard 
                    intel={targetIntel} 
                    onClose={isHintActive ? () => setHintActive(false) : undefined} 
                />
            </div>
        )}
        </>
    );
};
