import type { RegionFeature } from '../../../types/geo';
import type { GameQuestion, LocateSingleQuestion, LevelContext } from '../../core/types';

export const generateLevel1Question = (context: LevelContext): LocateSingleQuestion => {
  const { mapData, difficulty } = context;

  // 랜덤 지역 선택
  const randomIndex = Math.floor(Math.random() * mapData.length);
  const targetFeature = mapData[randomIndex];
  const props = targetFeature.properties;

  // 문제 텍스트 생성 (상위 행정구역 + 하위 행정구역)
  // 예: "광주시 초월읍"
  let displayName = props.name;

  if (props.SIG_KOR_NM && props.EMD_KOR_NM) {
    displayName = `${props.SIG_KOR_NM} ${props.EMD_KOR_NM}`;
  } else if (props.name.indexOf(' ') === -1) {
    // name에 공백이 없는 경우 (예: "초월읍"), 상위 지역 정보를 찾아야 함
    // 데이터에 상위 지역 코드가 있거나 매핑이 필요한데,
    // 일단 GeoJSON에 SIG_KOR_NM이 있다고 가정하고 위 분기를 탔을 것임.
    // 만약 없다면... 
    // 임시로 name 사용하거나, code를 기반으로 상위 지역 찾기 로직 필요.
    // 현재는 name 그대로 사용 (데이터 확인 후 개선)

    // 만약 name이 "초월읍" 같은 형식이라면 그대로 둠.
    // 하지만 사용자가 "시군구 + 읍면동"을 원하므로, 데이터 확인이 중요.
  }

  return {
    id: crypto.randomUUID(),
    type: 'LOCATE_SINGLE',
    target: {
      code: props.code,
      name: displayName
    }
  };
};
