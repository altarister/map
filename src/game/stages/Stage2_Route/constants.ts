// src/game/stages/Stage2_Route/constants.ts
// 2단계(합짐 배차 시뮬레이션) 게임 밸런스 상수

/** 합짐 정산 목표 콜 수 — 이 값에 도달하면 스트리밍 정지 + 정산 모드 진입 */
export const BATCH_TARGET_COUNT = 3;

/** 스트리밍 리스트 최대 보관 수 */
export const MAX_STREAMING_CALLS = 50;

/** km당 수익률 → 랭크 기준 (원/km) */
export const RANK_THRESHOLDS = {
  S: 4000,
  A: 2500,
  B: 1500,
  C: 800,
} as const;
// ======= 요금 및 거리 설정 =======
export const DEFAULT_MIN_FARE = 30000; // 시뮬레이션 시스템 상, 배차 시 보장되는 시각적 '최소 운임' 기준선
export const DEFAULT_MAX_PICKUP_DISTANCE_KM = 15; // 기사 현재 위치(빨간 점)에서 첫 상차지까지 허용되는 최대 공차 거리 (km)
export const FARE_PER_KM = 1500; // 상차지 -> 하차지까지의 이동 거리에 곱해지는 km당 요금 단가 (1,500원)
export const BASE_FARE = 10000; // 거리에 곱해지기 전, 기본적으로 깔고 들어가는 기본 운임 (10,000원)
export const PERFECT_FARE_MIN_EXTRA = 3000; // 정답 콜일 때, 시세보다 무조건 더 얹어주는 최소 단위의 '웃돈' (+3,000원)
export const PERFECT_FARE_RANDOM_EXTRA = 5000; // 무작위로 운임에 추가될 수 있는 요금 변동폭 (최대 +5,000원)
export const FAST_FARE_TRAP_MIN_RATIO = 0.6; // 오답 콜(똥콜) 함정일 경우, 정상 기준 운임의 최소 깎이는 비율 (60% 토막)
export const FAST_FARE_TRAP_MAX_RATIO = 0.9; // 오답 콜(똥콜) 함정일 경우, 정상 기준 운임의 최대 깎이는 비율 (90% 이하)

// ======= 확률 및 게임 밸런스 설정 =======
export const PROB_CORRECT_ANSWER = 0.3; // 정답 배차 확률 (기본값)
export const PROB_SHARED_ORDER = 0.3;   // 공유 오더 확률
export const PROB_EXPRESS_ORDER = 0.15; // 급송 오더 확률
export const PROB_MULTI_STOP = 0.25;    // 다중 경유콜 확률
export const PROB_BAD_FARE_TRAP = 0.5;  // 오답 콜 중 똥콜(운임 미달)일 확률 (나머지는 방향 오답)
export const PROB_MULTI_PICKUP = 0.3;   // 경유콜일 경우 상차가 2곳일 확률 (나머지 70%는 하차가 2~3곳)
export const PROB_MULTI_DROPOFF_EXTRA = 0.3; // 하차가 여러 곳일 때 3곳일 확률 (70%는 2곳)

// ======= 콜 발생 스케줄링 간격 설정 =======
export const MIN_CALL_DELAY_MS = 3000; // 새로운 콜이 발생하는 최소 대기 시간 (5초)
export const MAX_CALL_DELAY_MS = 8000; // 새로운 콜이 발생하는 최대 대기 시간 (10초)
export const INITIAL_CALL_COUNT = 4; // 시작 시 즉시 깔아주는 호출 개수

// ======= 모의 오더 메타데이터 옵션 풀 =======
export const WORK_HOUR_START = 8;
export const WORK_HOUR_END = 16;
export const VEHICLE_OPTIONS = ['오', '다', '라', '1t'];
export const ITEM_OPTIONS = ['박스 1개', '서류봉투', '쇼핑백 2개', '소형 가전', '샘플 박스', '마대 1개'];
export const CATEGORY_OPTIONS = ['보통', '보통', '예약'];
export const COMPANY_OPTIONS = ['태양메디스', '엠케이미디어', '씨엠파크-백암', '하나로유통', '부일물산', '한국부품', 'LG로지스'];
export const PAYMENT_OPTIONS: Array<'신용' | '선불' | '착불' | '월결'> = ['신용', '선불', '착불', '월결'];
export const BILLING_OPTIONS: Array<'계산서' | '인수증' | '무과세'> = ['계산서', '인수증', '무과세'];
