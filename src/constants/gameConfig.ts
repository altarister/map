import type { Difficulty } from "../types/game";

export const GAME_CONFIG = {
  DIFFICULTY: {
    EASY: { timeLimit: 60, scorePerCorrect: 100, penaltyPerIncorrect: 20 },
    MEDIUM: { timeLimit: 45, scorePerCorrect: 150, penaltyPerIncorrect: 30 },
    HARD: { timeLimit: 30, scorePerCorrect: 200, penaltyPerIncorrect: 50 },
  } as Record<Difficulty, { timeLimit: number, scorePerCorrect: number, penaltyPerIncorrect: number }>,
  
  MAP_SETTINGS: {
    // React-simple-maps 관련 설정
    // 라이브러리 내부 검증: scale은 0.1~10000 범위만 허용
    DEFAULT_SCALE: 8000, // 경기도 중심에 맞게 조정
    DEFAULT_CENTER: [127.25, 37.55] as [number, number], // 경기도 대략적 중심
  }
};
