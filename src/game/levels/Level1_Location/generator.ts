import type { RegionFeature } from '../../../types/geo';
import type { GameQuestion, LocateSingleQuestion, LevelContext } from '../../core/types';

/**
 * Level 1 (위치 찾기) 문제 생성 함수
 * 
 * ✅ BUG-003 FIX: Level 2 (시군구) 문제만 출제
 * - Level 2 코드: 5자리 (예: "41135" - 안산시)
 * - Level 3 코드: 10자리 (예: "4113511000" - 안산시 단원구 초지동)
 * - 이유: Zoom 1.0에서도 항상 클릭 가능하도록 하기 위함
 * - GDD Section 6.1 예시 "안산시 단원구"와 일치
 */
export const generateLevel1Question = (context: LevelContext): LocateSingleQuestion => {
  const { mapData, difficulty } = context;

  // ✅ BUG-003 FIX: Level 2 (시군구) 지역만 필터링
  // Level 2 코드 특징: 5자리 (예: "41135")
  const level2Regions = mapData.filter(
    f => f.properties.code && f.properties.code.length === 5
  );

  // Fallback: Level 2 지역이 없으면 전체 데이터 사용 (경고 로그)
  if (level2Regions.length === 0) {
    console.warn('[Level1] No Level 2 regions found. Using all regions as fallback.');
    const randomIndex = Math.floor(Math.random() * mapData.length);
    const targetFeature = mapData[randomIndex];
    const props = targetFeature.properties;

    return {
      id: crypto.randomUUID(),
      type: 'LOCATE_SINGLE',
      target: {
        code: props.code,
        name: props.name || props.SIG_KOR_NM || '알 수 없는 지역'
      }
    };
  }

  // Level 2 지역 중 랜덤 선택
  const randomIndex = Math.floor(Math.random() * level2Regions.length);
  const targetFeature = level2Regions[randomIndex];
  const props = targetFeature.properties;

  // 문제 텍스트 생성
  // Level 2는 "시군구" 단위이므로 name 또는 SIG_KOR_NM 사용
  const displayName = props.SIG_KOR_NM || props.name || '알 수 없는 지역';

  return {
    id: crypto.randomUUID(),
    type: 'LOCATE_SINGLE',
    target: {
      code: props.code,
      name: displayName
    }
  };
};
