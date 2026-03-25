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
