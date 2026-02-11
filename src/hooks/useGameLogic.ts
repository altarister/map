import { useState, useCallback, useRef } from 'react';
import type { GameState, GameScore, QuizQuestion, AnswerFeedback, Difficulty } from '../types/game';
import type { RegionFeature } from '../types/geo';

interface UseGameLogicReturn {
  gameState: GameState;
  currentQuestion: QuizQuestion | null;
  score: GameScore;
  startGame: () => void;
  checkAnswer: (code: string) => void;
  resetGame: () => void;
  lastFeedback: AnswerFeedback | null;
  answeredRegions: Set<string>;
  startTime: number | null;
  endTime: number | null;
}

export const useGameLogic = (
  regions: RegionFeature[], 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _difficulty: Difficulty,
  onGameEnd: (score: GameScore) => void
): UseGameLogicReturn => {
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [score, setScore] = useState<GameScore>({ correct: 0, incorrect: 0, duration: 0 });
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [lastFeedback, setLastFeedback] = useState<AnswerFeedback | null>(null);
  const [answeredRegions, setAnsweredRegions] = useState<Set<string>>(new Set());
  
  // 시간 측정용 Ref (리렌더링 방지)
  const startTimeRef = useRef<number | null>(null);
  
  // UI 표시용 상태
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  // eslint-disable-next-line no-undef
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 게임 종료 처리
  const endGame = useCallback(() => {
    const endTimestamp = Date.now();
    setEndTime(endTimestamp);
    setGameState('RESULT'); // 변경: ENDED가 아닌 RESULT 타입 사용 중인 것으로 추정됨 (types/game.ts 확인 필요하지만 기존 코드 참조)
    // types/game.ts를 보면 'IDLE' | 'PLAYING' | 'RESULT' 혹은 'ENDED' 였음. 
    // 이전 view_file 결과: types/game.ts: export type GameState = 'IDLE' | 'PLAYING' | 'RESULT';
    
    setScore(prev => {
      const duration = startTimeRef.current ? endTimestamp - startTimeRef.current : 0;
      const finalScore = { ...prev, duration };
      onGameEnd(finalScore);
      return finalScore;
    });
    
    setLastFeedback(null);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
  }, [onGameEnd]);

  // 다음 문제 출제 (내부에서만 사용)
  const setNextRandomQuestion = useCallback((currentAnsweredRegions: Set<string>) => {
    const availableRegions = regions.filter(r => !currentAnsweredRegions.has(r.properties.code));
    
    if (availableRegions.length === 0) {
      endGame();
      return;
    }

    const randomRegion = availableRegions[Math.floor(Math.random() * availableRegions.length)];
    setCurrentQuestion({
      regionCode: randomRegion.properties.code,
      regionName: randomRegion.properties.name,
    });
  }, [regions, endGame]);

  // 게임 시작
  const startGame = useCallback(() => {
    setScore({ correct: 0, incorrect: 0, duration: 0 });
    const newAnsweredRegions = new Set<string>();
    setAnsweredRegions(newAnsweredRegions);
    setLastFeedback(null);
    setEndTime(null);
    
    const now = Date.now();
    startTimeRef.current = now;
    setStartTime(now);
    
    setGameState('PLAYING');
    
    setNextRandomQuestion(newAnsweredRegions);
  }, [setNextRandomQuestion]);

  // 정답 확인
  const checkAnswer = useCallback((selectedCode: string) => {
    if (gameState !== 'PLAYING' || !currentQuestion) return;

    const isCorrect = selectedCode === currentQuestion.regionCode;
    const now = Date.now();

    // 피드백 설정
    const feedback: AnswerFeedback = {
      regionCode: selectedCode,
      correctCode: currentQuestion.regionCode,
      isCorrect,
      timestamp: now
    };
    setLastFeedback(feedback);

    // 피드백 타이머 (3초 후 제거)
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
        setLastFeedback(null);
    }, 3000);

    if (isCorrect) {
      setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
      
      const newAnswered = new Set(answeredRegions);
      newAnswered.add(selectedCode);
      setAnsweredRegions(newAnswered);
      
      // 다음 문제 출제
      setNextRandomQuestion(newAnswered);
      
    } else {
      setScore(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
    }
  }, [gameState, currentQuestion, answeredRegions, setNextRandomQuestion]);

  // 게임 초기화
  const resetGame = useCallback(() => {
    setGameState('IDLE');
    setScore({ correct: 0, incorrect: 0, duration: 0 });
    setCurrentQuestion(null);
    setLastFeedback(null);
    setAnsweredRegions(new Set());
    setStartTime(null);
    setEndTime(null);
  }, []);

  return {
    gameState,
    currentQuestion,
    score,
    startGame,
    checkAnswer,
    resetGame,
    lastFeedback,
    answeredRegions,
    startTime,
    endTime
  };
};
