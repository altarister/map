import type { ReactNode } from 'react';
import type { RegionFeature } from '../../types/geo';
import type { Difficulty, AnswerFeedback } from '../../types/game';
import type { RegionIntel } from '../../types/intel';

// 1. 문제 (Question) 타입 정의 (확장형 유니언 타입)
export type QuestionType = 'LOCATE_SINGLE' | 'LOCATE_PAIR' | 'ESTIMATE_DIST' | 'ESTIMATE_TIME' | 'PROFIT_ANALYSIS' | 'CALL_FILTER';

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
}

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

// 2단계: 콜 필터링 (배차 잡기)

export interface LocationPoint {
  code: string;
  name: string;
  fullName: string;
  centroid: [number, number];
  intel?: RegionIntel; // OSRM 휴리스틱 연산용
}

export interface CallItem {
  id: string; // 고유 ID (UI 렌더링 키값 등)
  pickups: LocationPoint[];   // 상차지 배열 (1개 이상)
  dropoffs: LocationPoint[];  // 하차지 배열 (1개 이상)
  pickupDistanceKm?: number;
  distanceKm: number;
  status?: string;          // 상태 (신규, 배차, 픽업, 완료, 등)
  isShared?: boolean;       // 공유 오더 여부 (출발지에 @ 표시)
  isExpress?: boolean;      // 급송 여부 (노란 바탕, 붉은 글씨, 합짐 불가)
  paymentType?: '신용' | '선불' | '착불' | '카드';     // 결제 방식 (신용/카드는 가상계좌(적립금) 차감, 선불/착불은 현금수수)
  billingType?: '계산서' | '인수증' | '무과세';        // 증빙 방식 (계산서는 파란 바탕)
  vehicleType?: string;     // 다, 라, 카, 마 (오토방/카고)
  itemDescription?: string; // 박스 1개, 서류 등
  callCategory?: string;    // 보통, 급행, 예약
  companyName?: string;     // 고객/상호명 (완료 탭 표기용)
  pickupTime?: string;      // 픽업 시간 (HH:MM)
  deliveryTime?: string;    // 예상 하차 시간 (HH:MM)
  fare: number;
  isMatchingRoute: boolean; // 유저 목표와 일치하는가?
  violation?: 'BAD_FARE' | 'WRONG_DEST';
}

export interface CallFilterQuestion extends BaseQuestion {
  type: 'CALL_FILTER';
  calls: CallItem[];
  driverLocation?: LocationPoint;
}

// 모든 문제 타입을 포함하는 유니언
export type GameQuestion = LocateSingleQuestion | LocatePairQuestion | EstimateDistanceQuestion | CallFilterQuestion;

// 2. 사용자 입력 (User Input) 타입 정의
export type InputType = 'MAP_CLICK' | 'OPTION_SELECT';

export type UserInput =
  | { type: 'MAP_CLICK'; regionCode: string }
  | { type: 'OPTION_SELECT'; value: string | number }
  | { type: 'ESTIMATE_VALUE'; value: number }
  | { type: 'CALL_ACCEPT'; call: any }; // CallItem type

// 3. 정답 검증 결과 (Validation Result)
export type ValidationResult =
  | { status: 'CORRECT'; feedback: AnswerFeedback }      // 정답 (다음 문제로)
  | { status: 'WRONG'; feedback: AnswerFeedback }        // 오답 (패널티 or 재시도)
  | { status: 'CONTINUE'; feedback?: AnswerFeedback; nextStepInstruction?: string; nextState?: any }; // 진행 중 (예: 상차지 찍고 하차지 찍기 전)

// 4. 레벨 전략 인터페이스 (Strategy Interface)
export interface StageContext {
  mapData: RegionFeature[];
  difficulty: Difficulty;
  targetRegion?: RegionFeature;
  targetDestCode?: string;
  currentLocCode?: string;
  maxPickupDistanceKm?: number;
  minFare?: number;
  autoDispatchFilter?: AutoDispatchFilter;
}

export interface StageUnlockCondition {
  // 특정 이전 단계를 클리어(숙달)해야 열리는 경우
  requireStageClear?: number;
}

export interface StageMapOptions {
  // 1단계처럼 시/군/구 뿐 아니라 읍/면/동 기하구조도 항상 허용하는지 여부
  forceShowTownGeometry?: boolean;
}

export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  shortDescription?: string; // UI 리스트에서 표시할 짧은 설명 추가
  badge?: string; // 예: ROOKIE, EXPERT 등
  unlockCondition?: StageUnlockCondition; // 잠금해제 필요 조건
  mapOptions?: StageMapOptions;
}

export interface StageStrategy {
  config: LevelConfig;

  // 문제 생성
  generateQuestion(ctx: StageContext): GameQuestion;

  // 정답 확인
  validateAnswer(question: GameQuestion, input: UserInput, state?: any): ValidationResult;

  // UI 렌더링 (지시문 등)
  renderInstruction(question: GameQuestion, step?: number): ReactNode;

  // 지도 오버레이 (마커, 선 등)
  renderMapOverlay(question: GameQuestion, mapData: RegionFeature[], state?: any): ReactNode;

  // 조작 패널 (옵션: 입력창, 제출 버튼 등)
  renderControlPanel?(question: GameQuestion, onSubmit: (input: UserInput) => void): ReactNode;
}

// 5. 자동배차 설정 인터페이스 (인성 기본 UI 완전 동기화)
export interface AutoDispatchFilter {
  allowWaypoint: boolean;       // 경유 허용 여부
  allowRoundTrip: boolean;      // 왕복 허용 여부
  pickupRadiusKm: number;       // 내위치 반경(km)
  minFare: number;              // 최소 운임
  maxFare: number;              // 최대 운임
  excludedKeywords: string;     // 제외 단어 (키워드 콤마 분리형)
  destinationKeywords: string;  // 도착지 단어 (키워드 콤마 분리형)
  customFilters: string[];      // 하단 빠른 설정 텍스트 (ex: "^^,@", "김포,인천...")
}
