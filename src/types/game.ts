export type GameState = 'IDLE' | 'LOADING' | 'PLAYING' | 'RESULT';

export interface QuizQuestion {
  regionCode: string;
  regionName: string;
}

export interface GameScore {
  correct: number;
  incorrect: number;
  duration: number; // 밀리초 단위
}

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface AnswerFeedback {
  regionCode: string;        // 클릭한 지역 코드
  regionName?: string;       // 클릭한 지역 이름 (오답 피드백용)
  correctCode: string;       // 정답 지역 코드
  isCorrect: boolean;        // 정답 여부
  timestamp?: number;        // 발생 시각 (자동 해제용)
}
