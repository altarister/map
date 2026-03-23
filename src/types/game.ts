// GDD 3-State 구조 지원
// INITIAL: 최초 진입 (Map만 표시, START 버튼 활성화)
// REGION_SELECT: Level/지역 선택 모달
// SUBREGION_SELECT: 상세 코스 시 읍/면/동 선택 상태 (Depth 2)
// PLAYING: 게임 진행 중
// PAUSED: 일시정지
// RESULT: 결과 화면
export type GameState = 'INITIAL' | 'GAME_MODE_SELECT' | 'REGION_SELECT' | 'SUBREGION_SELECT' | 'SET_DESTINATION' | 'CALL_DISPATCH' | 'PLAYING' | 'PAUSED' | 'RESULT';

export interface QuizQuestion {
  regionCode: string;
  regionName: string;
}

export interface GameScore {
  correct: number;
  incorrect: number;
  duration: number; // 밀리초 단위
  missedRegions: string[]; // 오답 지역 이름 리스트
}

export type Difficulty = 'NORMAL' | 'HARD';

export interface AnswerFeedback {
  regionCode: string;        // 클릭한 지역 코드
  regionName?: string;       // 클릭한 지역 이름 (오답 피드백용)
  correctCode: string;       // 정답 지역 코드
  isCorrect: boolean;        // 정답 여부
  timestamp?: number;        // 발생 시각 (자동 해제용)
  message?: string;          // 예외 상황(함정 콜)에 대한 상세 피드백 메시지
}
