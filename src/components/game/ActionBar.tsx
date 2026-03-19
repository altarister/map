import type { GameQuestion, UserInput } from '../../game/core/types';
import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useGeoContext } from '../../contexts/GeoDataContext';
import { useMemo, useState } from 'react';
import { RegionIntelCard } from '../overlays/RegionIntelCard';

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
    const { filteredMapData: geoData } = useGeoContext();
    const [intelExpanded, setIntelExpanded] = useState(false);

    // 타겟 지역의 인텔 정보 유추 (early return 전에 선언해야 Rules of Hooks 준수)
    const targetIntel = useMemo(() => {
        if (!currentQuestion || !geoData) return null;

        let targetCode: string | null = null;
        if (currentQuestion.type === 'LOCATE_SINGLE') {
            targetCode = currentQuestion.target.code;
        } else if (currentQuestion.type === 'LOCATE_PAIR') {
            targetCode = !levelState?.startCode ? currentQuestion.start.code : currentQuestion.end.code;
        }

        if (!targetCode) return null;

        const targetFeature = geoData.features.find((f: any) => f.properties.code === targetCode);
        return targetFeature?.properties?.intel || null;
    }, [currentQuestion, levelState?.startCode, geoData]);

    // 인텔 카드 노출 조건: 설정에서 켜져있거나, 힌트 ON, 오답 피드백 시
    const shouldShowIntel = viewOptions.showIntelCard || isHintActive || (lastFeedback && !lastFeedback.isCorrect);

    if (gameState !== 'PLAYING') return null;

    const handleAutoCorrect = () => {
        if (!currentQuestion) return;

        if (currentQuestion.type === 'LOCATE_SINGLE') {
            const input: UserInput = { type: 'MAP_CLICK', regionCode: currentQuestion.target.code };
            checkAnswer(input);
        } else if (currentQuestion.type === 'LOCATE_PAIR') {
            const needStart = !levelState?.startCode;
            const input: UserInput = {
                type: 'MAP_CLICK',
                regionCode: needStart ? currentQuestion.start.code : currentQuestion.end.code,
            };
            checkAnswer(input);
        }
    };



    return (
        <>
        {/* 좌측 패널: 문제 + 인텔 카드 통합 */}
        <div className="absolute top-20 left-4 z-[35] w-64 flex flex-col gap-2">

            {/* 문제 패널 */}
            <div className="glass-panel p-4 h-fit">
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

                {/* 본문: 문제 텍스트 + 점수 + 버튼 */}
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

            {/* 인텔 카드 (왼쪽 패널 하단에 통합) */}
            {shouldShowIntel && targetIntel && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* 인텔 접기/펼치기 토글 헤더 */}
                    <button
                        onClick={() => setIntelExpanded(prev => !prev)}
                        className="w-full flex items-center justify-between px-3 py-1.5 glass-panel text-[10px] text-gray-400 font-mono uppercase tracking-widest hover:text-white transition-colors"
                    >
                        <span>🗂 지역 인텔</span>
                        <span>{intelExpanded ? '▲ 접기' : '▼ 펼치기'}</span>
                    </button>
                    {intelExpanded && (
                        <RegionIntelCard
                            intel={targetIntel}
                            onClose={isHintActive ? () => setHintActive(false) : undefined}
                        />
                    )}
                </div>
            )}
        </div>

        {/* 우측 광고 슬롯 (Google AdSense 삽입 예정) */}
        <div className="absolute top-20 right-4 z-[35] w-64">
            <div className="glass-panel flex flex-col items-center justify-center gap-2 p-4 min-h-[250px] border border-dashed border-white/10">
                {/* 
                    [광고 영역]
                    Google AdSense 코드를 여기에 삽입하세요.
                    예시:
                    <ins className="adsbygoogle"
                        style={{ display: 'block' }}
                        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                        data-ad-slot="XXXXXXXXXX"
                        data-ad-format="auto" />
                */}
                <span className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">AD</span>
                <span className="text-[9px] text-gray-700 font-mono">300 × 250</span>
            </div>
        </div>
        </>
    );
};
