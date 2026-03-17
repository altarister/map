/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { GameState, GameScore, AnswerFeedback, Difficulty } from '../types/game';
import type { RegionFeature } from '../types/geo';
import type { GameQuestion, UserInput, ValidationResult } from '../game/core/types';
import { getStageStrategy } from '../game/stages/registry';

interface UseGameLogicReturn {
  gameState: GameState;
  setGameState: (state: GameState) => void; // 추가
  currentQuestion: GameQuestion | null;
  totalQuestions: number; // 전체 문제 수 추가
  score: GameScore;
  startGame: (overrideRegions?: RegionFeature[]) => void;
  checkAnswer: (input: UserInput) => void; // string code -> UserInput 객체로 변경
  skipQuestion: () => void; // 오답 처리 후 다음 문제로 스킵
  resetGame: () => void;
  lastFeedback: AnswerFeedback | null;
  answeredRegions: Set<string>;
  startTime: number | null;
  endTime: number | null;
  levelState: any;
  isHintActive: boolean;
  setHintActive: (active: boolean) => void;
}

export const useGameLogic = (
  regions: RegionFeature[],
  difficulty: Difficulty,
  currentStage: number, // 현재 게임 단계
  onGameEnd: (score: GameScore) => void
): UseGameLogicReturn => {
  const [gameState, setGameState] = useState<GameState>('REGION_SELECT');
  const [score, setScore] = useState<GameScore>({ correct: 0, incorrect: 0, duration: 0, missedRegions: [] });
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(null);
  const [lastFeedback, setLastFeedback] = useState<AnswerFeedback | null>(null);
  const [answeredRegions, setAnsweredRegions] = useState<Set<string>>(new Set());
  
  // ✅ 1DAL Trainer Spaced Repetition Queue 도입
  const [questionQueue, setQuestionQueue] = useState<RegionFeature[]>([]);
  const [totalQuestions, setTotalQuestions] = useState<number>(0); // 전체 문제 수 상태 추가

  // ✅ 힌트 모드 추가
  const [isHintActive, setHintActive] = useState<boolean>(false);

  // 레벨별 내부 상태 (예: 2단계에서 첫 번째 클릭 후 상태)
  const [levelState, setLevelState] = useState<any>(null);

  const startTimeRef = useRef<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);


  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingRef = useRef<boolean>(false); // Concurrency control


  // 게임 종료
  const endGame = useCallback(() => {
    const endTimestamp = Date.now();
    setEndTime(endTimestamp);
    setGameState('RESULT');

    setScore(prev => {
      const duration = startTimeRef.current ? endTimestamp - startTimeRef.current : 0;
      const finalScore = { ...prev, duration };
      onGameEnd(finalScore);
      return finalScore;
    });

    setLastFeedback(null);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
  }, [onGameEnd]);

  // 다음 문제 출제
  const setNextQuestion = useCallback((currentQueue: RegionFeature[]) => {
    if (currentQueue.length === 0) {
      endGame();
      return;
    }

    // 큐의 첫 번째 요소를 출제 대상으로 확정
    const mapDataToUse = [currentQueue[0]];

    const strategy = getStageStrategy(currentStage);
    const question = strategy.generateQuestion({
      mapData: mapDataToUse,
      difficulty
    });

    setCurrentQuestion(question);
    setLevelState(null); // 문제 바뀌면 레벨 상태 초기화
    setHintActive(false); // ✅ 새 문제가 출제되면 힌트 비활성화

    // Unlock processing for next question
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 100); // Slight delay to ensure UI updates
  }, [currentStage, difficulty, endGame]);

  // 게임 시작
  const startGame = useCallback((overrideRegions?: RegionFeature[]) => {
    setScore({ correct: 0, incorrect: 0, duration: 0, missedRegions: [] });
    setAnsweredRegions(new Set());
    setTotalQuestions(0);
    setLastFeedback(null);
    setEndTime(null);
    setLevelState(null);

    const now = Date.now();
    startTimeRef.current = now;
    setStartTime(now);

    setGameState('PLAYING');

    // 큐 초기화 로직: 중복 제거 후 섞기
    const targetRegions = overrideRegions || regions;
    const uniqueFeatures: RegionFeature[] = [];
    const seen = new Set<string>();
    for (const f of targetRegions) {
      if (!seen.has(f.properties.code)) {
        uniqueFeatures.push(f);
        seen.add(f.properties.code);
      }
    }
    
    // 배열 랜덤 셔플
    const shuffledQueue = uniqueFeatures.sort(() => Math.random() - 0.5);
    setTotalQuestions(shuffledQueue.length);
    setQuestionQueue(shuffledQueue);

    // ✅ FIX: 초기 큐를 바로 다음 문제 출제에 전달
    setNextQuestion(shuffledQueue);
  }, [regions, setNextQuestion]);

  // 레벨 변경 시 게임 초기화 (Lifecycle Management)
  useEffect(() => {
    // 1. Initialization Phase

    setGameState('INITIAL');
    setCurrentQuestion(null);
    setScore({ correct: 0, incorrect: 0, duration: 0, missedRegions: [] });
    setTotalQuestions(0);
    setLastFeedback(null);
    setAnsweredRegions(new Set());
    setLevelState(null);
    setStartTime(null);
    setEndTime(null);

    // ✅ BUG-001 FIX: 자동 게임 시작 제거
    // 사용자가 START 버튼을 명시적으로 클릭해야만 게임이 시작되도록 변경
    // GDD Section 2.1의 GameState 전환 흐름을 준수
    // INITIAL → (START 버튼 클릭) → REGION_SELECT → (레벨 선택) → PLAYING
  }, [currentStage]); // 게임 단계 변경 시 초기화

  // 정답 확인 (UserInput 처리)
  const checkAnswer = useCallback((input: UserInput) => {
    // PLAYING 상태가 아니거나 문제가 없으면 입력 무시 (안전장치)
    if (gameState !== 'PLAYING' || !currentQuestion) return;

    // Concurrency Check: Prevent double processing
    if (isProcessingRef.current) {
      console.warn("[GameLogic] Validation skipped: Already processing an answer.");
      return;
    }

    const strategy = getStageStrategy(currentStage);

    // [Defensive] 현재 레벨의 전략이 지원하는 문제 타입인지 확인
    // (이론상 발생하면 안 되지만, 비동기 상태 불일치 방지)
    try {
      // 전략 내부에서 타입 체크를 수행하고 에러를 던질 수 있음.
      // 여기서는 에러를 무시하고 리턴하여 게임이 멈추는 것을 방지.
      const result: ValidationResult = strategy.validateAnswer(currentQuestion, input, levelState);

      const now = Date.now();

      // 피드백 처리
      if (result.feedback) {
        const feedbackWithTimestamp = { ...result.feedback, timestamp: now };
        setLastFeedback(feedbackWithTimestamp);

        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = setTimeout(() => {
          setLastFeedback(null);
        }, 3000);
      }

      if (result.status === 'CORRECT') {
        // Lock processing immediately to prevent double scoring
        isProcessingRef.current = true;

        // 정답 처리
        setScore(prev => ({ ...prev, correct: prev.correct + 1 }));

        // 큐에서 선두 요소 제거 (정답)
        const nextQueue = [...questionQueue];
        if (nextQueue.length > 0) {
          nextQueue.shift();
        }
        setQuestionQueue(nextQueue);

        // 시각화용 지도 기록
        if (currentQuestion.type === 'LOCATE_SINGLE') {
          setAnsweredRegions(prev => {
            const newSet = new Set(prev);
            newSet.add(currentQuestion.target.code);
            return newSet;
          });
        }
        
        // 곧바로 다음 문제로 (큐의 다음 타자)
        setNextQuestion(nextQueue);

      } else if (result.status === 'WRONG') {
        // 오답 노트: 지역 이름 추가
        let missedName = '알 수 없는 지역';
        if (currentQuestion.type === 'LOCATE_SINGLE') {
          missedName = currentQuestion.target.name;
        }

        setScore(prev => ({
          ...prev,
          incorrect: prev.incorrect + 1,
          missedRegions: [...prev.missedRegions, missedName]
        }));
        
        // [Spaced Repetition] 큐에서 팝(Pop) 후 3칸 뒤(또는 맨 뒤)로 재삽입(Splice)
        const nextQueue = [...questionQueue];
        if (nextQueue.length > 1) { // 2개 이상일 때만 뒤로 미루기 무빙 가능
          const wrongItem = nextQueue.shift();
          if (wrongItem) {
            const insertIndex = Math.min(3, nextQueue.length); // 3칸 뒤로 미루거나 배열 끝에 삽입
            nextQueue.splice(insertIndex, 0, wrongItem);
          }
          setQuestionQueue(nextQueue);
          
          // 오답 직후에도 곧바로 다음 문제 출제 (큐가 변동되었으므로)
          // 기존 코드처럼 머무르지 않고, 벌칙 대상(오답 문제)을 큐 뒤로 버리고 다음 걸로 넘어감
          setNextQuestion(nextQueue);
        } else {
          // 남은 문제가 딱 1개뿐인데 틀린 경우 그 문제를 계속 다시 풀어야 함
          setNextQuestion(nextQueue);
        }
      } else if (result.status === 'CONTINUE') {
        // 진행 중 (예: 포인트 하나 찍음)
        if (result.nextState) {
          setLevelState(result.nextState);
        }
      }
    } catch (e) {
      console.warn("[GameLogic] Validation skipped due to type mismatch or error:", e);
      // 에러 발생 시 별도 처리 없음 (입력 무시)
    }

  }, [gameState, currentQuestion, currentStage, levelState, answeredRegions, questionQueue, setNextQuestion]);

  // 현재 문제를 오답 처리하고 다음 문제로 스킵
  const skipQuestion = useCallback(() => {
    if (gameState !== 'PLAYING' || !currentQuestion) return;
    if (isProcessingRef.current) return;

    const now = Date.now();
    const missedName =
      currentQuestion.type === 'LOCATE_SINGLE' ? currentQuestion.target.name :
      currentQuestion.type === 'LOCATE_PAIR' ? `${currentQuestion.start.name} → ${currentQuestion.end.name}` :
      '알 수 없는 지역';

    setLastFeedback({ isCorrect: false, regionCode: '', correctCode: '', regionName: '스킵', timestamp: now });
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setLastFeedback(null), 2000);

    setScore(prev => ({
      ...prev,
      incorrect: prev.incorrect + 1,
      missedRegions: [...prev.missedRegions, missedName],
    }));

    const nextQueue = [...questionQueue];
    if (nextQueue.length > 1) {
      const skippedItem = nextQueue.shift();
      if (skippedItem) {
        const insertIndex = Math.min(3, nextQueue.length);
        nextQueue.splice(insertIndex, 0, skippedItem);
      }
    } else {
      // 1개뿐이면 그대로 유지 (계속 같은 문제)
    }
    setQuestionQueue(nextQueue);
    setNextQuestion(nextQueue);
  }, [gameState, currentQuestion, questionQueue, setNextQuestion]);

  // 게임 초기화
  const resetGame = useCallback(() => {
    setGameState('REGION_SELECT');
    setScore({ correct: 0, incorrect: 0, duration: 0, missedRegions: [] });
    setTotalQuestions(0);
    setCurrentQuestion(null);

    setLastFeedback(null);
    setAnsweredRegions(new Set());
    setLevelState(null);
    setStartTime(null);
    setEndTime(null);
  }, []);

  return {
    gameState,
    setGameState, // 추가
    currentQuestion,
    totalQuestions,
    score,
    startGame,
    checkAnswer,
    skipQuestion,
    resetGame,
    lastFeedback,
    answeredRegions,
    startTime,
    endTime,
    levelState,
    isHintActive,
    setHintActive
  };
};
