import type { ReactNode } from 'react';
import type { RegionFeature } from '../../types/geo';
import type { Difficulty, GameState, AnswerFeedback } from '../../types/game';

// 1. 문제 (Question) 타입 정의 (확장형 유니언 타입)
export type QuestionType = 'LOCATE_SINGLE' | 'LOCATE_PAIR' | 'ESTIMATE_DIST' | 'ESTIMATE_TIME' | 'PROFIT_ANALYSIS';

export interface BaseQuestion {
  id: string;
  type: QuestionType;
}

// 1단계: 단일 지역 찾기
export interface LocateSingleQuestion extends BaseQuestion {
  type: 'LOCATE_SINGLE';
  target: {
    code: string;
    name: string;
  };
}

// 2단계: 상/하차지 찾기 (경로)
export interface LocatePairQuestion extends BaseQuestion {
  type: 'LOCATE_PAIR';
  start: {
    code: string;
    name: string;
  };
  end: {
    code: string;
    name: string;
  };


// 3단계: 거리 추정 (Distance)
export interface EstimateDistanceQuestion extends BaseQuestion {
  type: 'ESTIMATE_DIST';
  start: {
    code: string;
    name: string;
    coordinate: [number, number]; // 중심 좌표 필요
  };
  end: {
    code: string;
    name: string;
    coordinate: [number, number]; // 중심 좌표 필요
  };
  actualDistance: number; // 실제 거리 (km)
}

// 모든 문제 타입을 포함하는 유니언
export type GameQuestion = LocateSingleQuestion | LocatePairQuestion | EstimateDistanceQuestion;

// 2. 사용자 입력 (User Input) 타입 정의
export type InputType = 'MAP_CLICK' | 'OPTION_SELECT';

export type UserInput = 
  | { type: 'MAP_CLICK'; regionCode: string }
  | { type: 'OPTION_SELECT'; value: string | number }
  | { type: 'ESTIMATE_VALUE'; value: number }; // 거리 등 수치 입력

// 3. 정답 검증 결과 (Validation Result)
export type ValidationResult = 
  | { status: 'CORRECT'; feedback: AnswerFeedback }      // 정답 (다음 문제로)
  | { status: 'WRONG'; feedback: AnswerFeedback }        // 오답 (패널티 or 재시도)
  | { status: 'CONTINUE'; feedback?: AnswerFeedback; nextStepInstruction?: string; nextState?: any }; // 진행 중 (예: 상차지 찍고 하차지 찍기 전)

// 4. 레벨 전략 인터페이스 (Strategy Interface)
export interface LevelContext {
  mapData: RegionFeature[];
  difficulty: Difficulty;
}

export interface LevelConfig {
  id: number;
  name: string;
  description: string;
}

export interface LevelStrategy {
  config: LevelConfig;

  // 문제 생성
  generateQuestion(ctx: LevelContext): GameQuestion;

  // 정답 확인
  validateAnswer(question: GameQuestion, input: UserInput, state?: any): ValidationResult;

  // UI 렌더링 (지시문 등)
  renderInstruction(question: GameQuestion, step?: number): ReactNode;

  // 지도 오버레이 (마커, 선 등)
  renderMapOverlay(question: GameQuestion, mapData: RegionFeature[], state?: any): ReactNode;

  // 조작 패널 (옵션: 입력창, 제출 버튼 등)
  renderControlPanel?(question: GameQuestion, onSubmit: (input: UserInput) => void): ReactNode;
}
