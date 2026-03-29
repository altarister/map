import type { GameQuestion, UserInput } from '../../game/core/types';
import { useGame } from '../../contexts/GameContext';
import { useGeoContext } from '../../contexts/GeoDataContext';
import { useMemo, useState } from 'react';
import { RegionCheatSheet } from './RegionCheatSheet';


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
export const Stage1ActionBar = () => {
    const { gameState, currentQuestion, lastFeedback, isHintActive, setHintActive, checkAnswer, levelState, skipQuestion, score, totalQuestions, isEssentialMode, toggleEssentialMode } = useGame();

    const { filteredMapData: geoData } = useGeoContext();
    const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);


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
                    {/* 헤더: 필터 토글 + 정답 버튼 */}
                    <div className="flex items-center justify-between mb-2 pb-1">
                        <div className="flex rounded bg-black/40 overflow-hidden text-[10px] font-mono border border-white/10 shadow-inner">
                            <button
                                onClick={() => toggleEssentialMode(false)}
                                className={`px-2.5 py-1 transition-colors ${!isEssentialMode ? 'bg-[#3A3F47] text-white font-bold' : 'text-gray-400 hover:text-gray-300'}`}
                                title="모든 지역 (랜덤 출제)"
                            >
                                모두
                            </button>
                            <button
                                onClick={() => toggleEssentialMode(true)}
                                className={`px-2.5 py-1 transition-colors ${isEssentialMode ? 'bg-blue-600 font-bold text-white' : 'text-gray-400 hover:text-gray-300'}`}
                                title="핵심 지역 (오더량 중~최상)"
                            >
                                필수
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsCheatSheetOpen(!isCheatSheetOpen)}
                                className={`px-2 py-0.5 text-xs font-bold rounded transition-colors ${isCheatSheetOpen ? 'bg-yellow-500/30 text-yellow-300' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/40'}`}
                                title="지역 암기장 열기"
                            >
                                💡 암기장
                            </button>
                            <button
                                onClick={handleAutoCorrect}
                                className="px-2 py-0.5 text-xs font-bold rounded transition-colors bg-green-500/20 text-green-400 hover:bg-green-500/40"
                                title="정답 자동 처리"
                            >
                                ✓ 정답
                            </button>
                        </div>
                    </div>

                    {/* 본문: 문제 텍스트 + 인텔 + 점수 + 버튼 */}
                    {currentQuestion ? (
                        <div className="flex flex-col gap-2">
                            {/* 문제 텍스트 — 항상 표시 */}
                            <p className="text-base font-bold text-white leading-snug">
                                {getQuestionText(currentQuestion)}
                            </p>

                            {/* 인텔 정보 — 데이터 있을 때만 표시 */}
                            {targetIntel && (
                                <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                                    {/* 중요도 + 오더량 */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-0.5 text-[10px]">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <span key={s} className={s <= targetIntel.importance ? 'text-yellow-400' : 'text-gray-700'}>★</span>
                                            ))}
                                        </div>
                                        <div className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${targetIntel.orderVolume.includes('상') ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                            : targetIntel.orderVolume.includes('중') ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                                                : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                                            }`}>오더 {targetIntel.orderVolume}</div>
                                    </div>

                                    {/* 주요 도로 */}
                                    {targetIntel.roads.length > 0 && (
                                        <div>
                                            <h4 className="text-gray-500 mb-0.5 font-mono uppercase text-[9px]">주요도로</h4>
                                            <div className="flex flex-wrap gap-1">
                                                {targetIntel.roads.map((road: string, idx: number) => (
                                                    <span key={idx} className="bg-white/10 text-white/90 px-1.5 py-0.5 rounded text-[10px]">{road}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 주요 거점 */}
                                    {targetIntel.landmarks && targetIntel.landmarks.length > 0 && (
                                        <div>
                                            <h4 className="text-emerald-400 mb-0.5 font-mono uppercase text-[9px]">📍 주요 거점</h4>
                                            <div className="flex flex-wrap gap-1">
                                                {targetIntel.landmarks.map((mark: string, idx: number) => (
                                                    <span key={idx} className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 text-[10px] font-bold">{mark}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 실전 팁 */}
                                    {targetIntel.fieldTips.length > 0 && (
                                        <div className="text-xs bg-black/20 rounded p-2 border border-white/5">
                                            <h4 className="text-yellow-500 mb-1 font-bold text-[9px]">💡 실전 인텔</h4>
                                            <ul className="space-y-1 text-gray-300">
                                                {targetIntel.fieldTips.map((tip: string, idx: number) => (
                                                    <li key={idx} className="flex gap-1.5 leading-snug">
                                                        <span className="text-yellow-600 opacity-70">▸</span>
                                                        <span>{tip}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
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

            </div>

            {/* 암기장 UI: 버튼으로 토글 */}
            {isCheatSheetOpen && <RegionCheatSheet onClose={() => setIsCheatSheetOpen(false)} />}
        </>
    );
};
