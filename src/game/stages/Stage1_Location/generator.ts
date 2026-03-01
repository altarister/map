import type { LocateSingleQuestion, StageContext } from '../../core/types';

/**
 * Stage 1 (위치 찾기) 문제 생성 함수
 * 
 * ✅ BUG-003 FIX: Stage 2 (시군구) 문제만 출제
 * - Level 2 코드: 5자리 (예: "41135" - 안산시)
 * - Level 3 코드: 10자리 (예: "4113511000" - 안산시 단원구 초지동)
 * - 이유: Zoom 1.0에서도 항상 클릭 가능하도록 하기 위함
 * - GDD Section 6.1 예시 "안산시 단원구"와 일치
 */
export const generateStage1Question = (context: StageContext): LocateSingleQuestion => {
  const { mapData } = context;

  // GDD v2.0 Update: Level 3 (읍/면/동) 문제 출제
  // Level 3 코드: 8자리~10자리 (예: "4113511000" - 안산시 단원구 초지동)

  // 이미 필터링된 데이터(mapData)에서 랜덤 선택
  if (mapData.length === 0) {
    console.warn('[Stage1] No Level 3 regions found.');
    return {
      id: crypto.randomUUID(),
      type: 'LOCATE_SINGLE',
      target: {
        code: 'ERROR',
        name: '지역 데이터 없음'
      }
    };
  }

  // Deduplicate by code so probabilities are equal across Eup/Myeon (Basic mode)
  const uniqueFeatures = [];
  const seenCodes = new Set<string>();
  for (const f of mapData) {
    if (!seenCodes.has(f.properties.code)) {
      uniqueFeatures.push(f);
      seenCodes.add(f.properties.code);
    }
  }

  const randomIndex = Math.floor(Math.random() * uniqueFeatures.length);
  const targetFeature = uniqueFeatures[randomIndex];
  const props = targetFeature.properties;

  // 문제 텍스트 생성: "[시/군] [읍/면/동/리]"
  const cityName = props.SIG_KOR_NM || '';

  const emdName = props.EMD_KOR_NM;
  const name = props.name;
  let districtName = '';

  // 리(Ri) 단위일 경우 "[읍/면] [리]" 형식으로 표시
  if (emdName && name && emdName !== name && !name.endsWith('동')) {
    districtName = `${emdName} ${name}`;
  } else {
    districtName = name || emdName || '';
  }

  const displayName = `${cityName} ${districtName}`.trim() || '알 수 없는 지역';

  return {
    id: crypto.randomUUID(),
    type: 'LOCATE_SINGLE',
    target: {
      code: props.code,
      name: displayName
    }
  };
};
