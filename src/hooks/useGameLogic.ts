import { useState, useCallback, useRef, useEffect } from 'react';
import type { GameState, GameScore, AnswerFeedback, Difficulty } from '../types/game';
import type { RegionFeature } from '../types/geo';
import type { GameQuestion, UserInput, ValidationResult } from '../game/core/types';
import { getLevelStrategy } from '../game/levels/registry';

interface UseGameLogicReturn {
  gameState: GameState;
  setGameState: (state: GameState) => void; // 추가
  currentQuestion: GameQuestion | null;
  score: GameScore;
  startGame: (overrideRegions?: RegionFeature[]) => void;
  checkAnswer: (input: UserInput) => void; // string code -> UserInput 객체로 변경
  resetGame: () => void;
  lastFeedback: AnswerFeedback | null;
  answeredRegions: Set<string>;
  startTime: number | null;
  endTime: number | null;
  levelState: any;
}

export const useGameLogic = (
  regions: RegionFeature[],
  difficulty: Difficulty,
  currentLevel: number, // 현재 레벨 추가
  onGameEnd: (score: GameScore) => void,
  mapDataLevel2: RegionFeature[] = [] // ✅ BUG-003 FIX: Level 2 데이터 추가
): UseGameLogicReturn => {
  const [gameState, setGameState] = useState<GameState>('LEVEL_SELECT');
  const [score, setScore] = useState<GameScore>({ correct: 0, incorrect: 0, duration: 0 });
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(null);
  const [lastFeedback, setLastFeedback] = useState<AnswerFeedback | null>(null);
  const [answeredRegions, setAnsweredRegions] = useState<Set<string>>(new Set());

  // 레벨별 내부 상태 (예: 2단계에서 첫 번째 클릭 후 상태)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [levelState, setLevelState] = useState<any>(null);

  const startTimeRef = useRef<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  // eslint-disable-next-line no-undef
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const setNextQuestion = useCallback((currentAnsweredRegions: Set<string>, regionsOverride?: RegionFeature[]) => {
    // ✅ BUG-003 FIX: Level 1은 Level 2 데이터 사용
    // Level 1: 위치 찾기 (시군구) → mapDataLevel2 사용
    // Level 2+: 경로, 거리 등 → regions (Level 3) 사용
    let mapDataToUse: RegionFeature[];

    // ✅ FIX: Use override regions if provided (for game start), otherwise use current regions prop
    const targetRegions = regionsOverride || regions;

    if (currentLevel === 1) {
      // Level 1: Level 2 (시군구) 데이터 사용

      console.log('[GameLogic] setNextQuestion Level 1');
      console.log('[GameLogic] targetRegions length:', targetRegions?.length);
      if (targetRegions?.length > 0) {
        console.log('[GameLogic] Sample targetRegion code:', targetRegions[0].properties.code);
      }

      // 1. 현재 regions(Level 3)에 포함된 Level 2 코드 추출 (유효성 검증용)
      const validLevel2Codes = new Set<string>();
      targetRegions.forEach(r => {
        if (r.properties.code && r.properties.code.length >= 5) {
          validLevel2Codes.add(r.properties.code.substring(0, 5));
        }
      });

      // GDD v2.0 Update: 항상 읍/면/동(Level 3) 단위로 문제 출제
      // 시/군(Level 2) 선택 여부와 관계없이 상세 지역 학습 유도
      mapDataToUse = targetRegions.filter(r => !currentAnsweredRegions.has(r.properties.code));

    } else {
      // Level 2+: 기존 로직 (Level 3 데이터 사용)
      mapDataToUse = targetRegions.filter(r => !currentAnsweredRegions.has(r.properties.code));
    }

    if (mapDataToUse.length === 0) {
      endGame();
      return;
    }

    /* Debug logs removed */

    if (mapDataToUse.length === 0) {
      endGame();
      return;
    }

    const strategy = getLevelStrategy(currentLevel);
    const question = strategy.generateQuestion({
      mapData: mapDataToUse, // ✅ Level에 맞는 데이터 전달
      difficulty
    });

    setCurrentQuestion(question);
    setLevelState(null); // 문제 바뀌면 레벨 상태 초기화
  }, [regions, currentLevel, difficulty, endGame, mapDataLevel2]);

  // 게임 시작
  const startGame = useCallback((overrideRegions?: RegionFeature[]) => {
    setScore({ correct: 0, incorrect: 0, duration: 0 });
    const newAnsweredRegions = new Set<string>();
    setAnsweredRegions(newAnsweredRegions);
    setLastFeedback(null);
    setEndTime(null);
    setLevelState(null);

    const now = Date.now();
    startTimeRef.current = now;
    setStartTime(now);

    setGameState('PLAYING');

    // ✅ FIX: Pass overrideRegions to setNextQuestion to ensure correct initial question
    setNextQuestion(newAnsweredRegions, overrideRegions);
  }, [setNextQuestion]);

  // 레벨 변경 시 게임 초기화 (Lifecycle Management)
  useEffect(() => {
    // 1. Initialization Phase
    setGameState('INITIAL');
    setCurrentQuestion(null);
    setScore({ correct: 0, incorrect: 0, duration: 0 });
    setLastFeedback(null);
    setAnsweredRegions(new Set());
    setLevelState(null);
    setStartTime(null);
    setEndTime(null);

    // ✅ BUG-001 FIX: 자동 게임 시작 제거
    // 사용자가 START 버튼을 명시적으로 클릭해야만 게임이 시작되도록 변경
    // GDD Section 2.1의 GameState 전환 흐름을 준수
    // INITIAL → (START 버튼 클릭) → LEVEL_SELECT → (레벨 선택) → PLAYING
  }, [currentLevel]); // startGame, regions.length 의존성 제거(UserInput 처리)

  // 정답 확인 (UserInput 처리)
  const checkAnswer = useCallback((input: UserInput) => {
    // PLAYING 상태가 아니거나 문제가 없으면 입력 무시 (안전장치)
    if (gameState !== 'PLAYING' || !currentQuestion) return;

    const strategy = getLevelStrategy(currentLevel);

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
        // 정답 처리
        setScore(prev => ({ ...prev, correct: prev.correct + 1 }));

        // 정답 맞추면 다음 문제로
        if (currentQuestion.type === 'LOCATE_SINGLE') {
          const newAnswered = new Set(answeredRegions);
          newAnswered.add(currentQuestion.target.code);
          setAnsweredRegions(newAnswered);
        }
        // 2단계 등 다른 레벨도 정답 처리 후 다음 문제
        // answeredRegions 상태 업데이트가 비동기이므로, 
        // 다음 문제 생성 시에는 현재 스냅샷 + 방금 맞춘 것(필요시)을 고려해야 함.
        // 하지만 setNextQuestion은 의존성 배열에 answeredRegions를 가지고 있지 않고,
        // 인자로 받아서 처리함.

        // LOCATE_SINGLE인 경우 방금 추가된 것을 포함해서 넘겨야 함.
        const nextAnswered = new Set(answeredRegions);
        if (currentQuestion.type === 'LOCATE_SINGLE') {
          nextAnswered.add(currentQuestion.target.code);
        }
        setNextQuestion(nextAnswered);

      } else if (result.status === 'WRONG') {
        setScore(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
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

  }, [gameState, currentQuestion, currentLevel, levelState, answeredRegions, setNextQuestion]);

  // 게임 초기화
  const resetGame = useCallback(() => {
    setGameState('LEVEL_SELECT');
    setScore({ correct: 0, incorrect: 0, duration: 0 });
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
    score,
    startGame,
    checkAnswer,
    resetGame,
    lastFeedback,
    answeredRegions,
    startTime,
    endTime,
    levelState
  };
};
