/**
 * SelectionLevel — 지역 선택 화면의 행정 계층 단계
 *
 * 대한민국 행정구역 표준 계층 (REGION_EXPANSION_POLICY_AND_GUIDE.md 기준):
 *   PROVINCE  → 광역 자치단체 (서울/인천/경기도, 코드 2자리)
 *   CITY      → 시/군/자치구 (수원시/광주시/강남구, 코드 5자리)
 *   DISTRICT  → 대도시 일반구 (덕양구/기흥구, 코드 5자리, 대도시만 해당)
 *   DONG      → 읍/면/법정동 (게임 진입 시점, 코드 7~8자리)
 *
 * 진입 경로:
 *   일반 시/군: PROVINCE → CITY → (DONG: 게임 시작)
 *   대도시 특례: PROVINCE → CITY → DISTRICT → (DONG: 게임 시작)
 */
export type SelectionLevel = 'PROVINCE' | 'CITY' | 'DISTRICT' | 'DONG';

/** 각 SelectionLevel에 대응하는 한국어 라벨 */
export const SELECTION_LEVEL_LABEL: Record<SelectionLevel, string> = {
    PROVINCE: '1단계: 광역 자치단체',
    CITY:     '2단계: 시/군/자치구',
    DISTRICT: '3단계: 일반구',
    DONG:     '4단계: 읍/면/법정동',
};
