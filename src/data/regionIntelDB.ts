import type { RegionIntelDatabase, RegionIntel } from '../types/intel';

/**
 * 전국의 각 행정구역에 대한 "실전 배달 정보"를 보관하는 데이터베이스입니다.
 * Key는 각 지역의 고유 regionCode (법정동/행정동 코드) 입니다.
 */
export const regionIntelDB: RegionIntelDatabase = {
  // --------------------------------------------------------------------------
  // 경기도 여주시 (코드: 31280 또는 하위 읍/면/동 코드)
  // --------------------------------------------------------------------------
  
  // 1. 가남읍
  "41670250": {
    regionCode: "41670250",
    name: "가남읍",
    parentName: "여주시",
    roads: ["국도 3호선", "중부내륙고속도로 (가남IC)", "지방도 333호선"],
    orderVolume: "중상",
    importance: 4,
    fieldTips: [
      "태평리 중심으로 상권과 아파트가 어느 정도 형성되어 있어 여주시 내에서는 콜이 꽤 나오는 편.",
      "단, 여주 시내(동 지역)와 거리가 멀어 한 번 들어가면 외곽으로 빠지게 됨.",
      "복귀 콜이나 이천 방면 연계 오더를 계산하고 진입하는 것이 필수."
    ]
  },
  
  // 2. 점동면
  "41670310": {
    regionCode: "41670310",
    name: "점동면",
    parentName: "여주시",
    roads: ["국도 37호선", "지방도 345호선"],
    orderVolume: "하",
    importance: 1,
    fieldTips: [
      "충청북도와 맞닿아 있는 여주시 최남단 외곽.",
      "농업 위주의 지역으로, 배달 수요는 매우 적음.",
      "배달 단가가 높더라도 빈 차 복귀 리스크가 커서 초보자에게는 추천하지 않음."
    ]
  },

  // 3. 흥천면
  "41670320": {
    regionCode: "41670320",
    name: "흥천면",
    parentName: "여주시",
    roads: ["광주원주고속도로 (흥천이포IC)", "국지도 70호선"],
    orderVolume: "하",
    importance: 2,
    fieldTips: [
      "이천시 부발읍/백사면과 이어진다.",
      "동네 자체 오더보다는 이천과 여주를 오가는 통과 경로로서의 의미가 더 큼."
    ]
  },

  // 4. 금사면
  "41670330": {
    regionCode: "41670330",
    name: "금사면",
    parentName: "여주시",
    roads: ["국지도 70호선 (이포대교)"],
    orderVolume: "하",
    importance: 1,
    fieldTips: [
      "남한강을 끼고 있으며 참외로 유명한 농촌 마을.",
      "배달지로는 기피 대상이나, 양평군 강상면 쪽으로 넘어가는 길목."
    ]
  },

  // 5. 세종대왕면 (구 능서면)
  "41670345": {
    regionCode: "41670345",
    name: "세종대왕면",
    parentName: "여주시",
    roads: ["국도 42호선 (중부대로)", "경강선 (세종대왕릉역)"],
    orderVolume: "중하",
    importance: 3,
    fieldTips: [
      "여주 시내(동 지역)와 가깝고 도로가 잘 뚫려 있어 접근성이 좋음.",
      "이천시 부발읍(SK하이닉스 방면)으로 넘어갈 때 주로 통과하는 핵심 도로가 위치함."
    ]
  },

  // 6. 대신면
  "41670350": {
    regionCode: "41670350",
    name: "대신면",
    parentName: "여주시",
    roads: ["광주원주고속도로 (대신IC)", "국도 37호선"],
    orderVolume: "하",
    importance: 2,
    fieldTips: [
      "양평 방면으로 넓게 퍼져 있는 외곽 지역.",
      "대신IC 주변을 제외하면 야간 주행 시 도로가 어둡고 인적이 드문 편."
    ]
  },

  // 7. 북내면
  "41670360": {
    regionCode: "41670360",
    name: "북내면",
    parentName: "여주시",
    roads: ["광주원주고속도로 (동여주IC)"],
    orderVolume: "하",
    importance: 2,
    fieldTips: [
      "여주시 북쪽 외곽. 스카이밸리 CC 등 골프장 인근 식당 수요가 간헐적으로 있음.",
      "동여주IC(하이패스 전용)를 통해 고속도로로 바로 진출입 가능."
    ]
  },

  // 8. 강천면
  "41670370": {
    regionCode: "41670370",
    name: "강천면",
    parentName: "여주시",
    roads: ["영동고속도로 (여주IC 인접)", "국도 42호선"],
    orderVolume: "하",
    importance: 2,
    fieldTips: [
      "강원도 원주시 문막읍과 바로 붙어있는 경계선.",
      "장거리 픽업이 종종 뜨지만 복귀 콜이 거의 없으니 요금 펌핑 시에만 고려할 것."
    ]
  },

  // 9. 산북면
  "41670380": {
    regionCode: "41670380",
    name: "산북면",
    parentName: "여주시",
    roads: ["국지도 98호선"],
    orderVolume: "하",
    importance: 1,
    fieldTips: [
      "광주시 곤지암읍(도척면) 방면과 산길로 이어짐.",
      "여주시 내에서도 가장 외진 산골 지형 중 하나이므로 배달 진입을 피하는 것이 상책."
    ]
  },

  // 10. 동 지역 통합 (여흥동, 중앙동, 오학동 묶음 - 임시코드)
  // 실제 geojson은 하동, 창동 등 세부 코드가 들어가 있을 것. 
  // 여기서는 동 지역 대표 데이터를 작성.
  "416701": {
    regionCode: "416701",
    name: "시내권 (여흥/중앙/오학동)",
    parentName: "여주시",
    roads: ["국도 42호선", "국도 37호선", "여주대교"],
    orderVolume: "상",
    importance: 5,
    fieldTips: [
      "여주시청, 여주역, 여주터미널이 모여 있는 여주시 배달의 심장부.",
      "강남(남한강 이남)의 '중앙동/여흥동'과 강북의 '오학동(아파트 밀집)'으로 나뉨.",
      "출퇴근 시간에 여주대교가 꽤 막히므로 콜을 잡을 때 강을 건너는 동선인지 맵핑 필수."
    ]
  }
};

/**
 * 주어진 지역 코드로 지역 인텔 정보를 검색합니다.
 * GeoJSON의 법정동 코드가 10자리(예: 4167025021)로 들어오더라도,
 * DB에 정의된 8자리(읍면동, 41670250) 코드로 매칭되도록 처리합니다.
 */
export const getIntelForRegion = (regionCode: string): RegionIntel | null => {
  if (!regionCode) return null;
  // 1. 정확히 매칭되는 경우
  if (regionIntelDB[regionCode]) {
    return regionIntelDB[regionCode];
  }
  
  // 2. 10자리 코드 등의 경우, 앞 8자리 또는 앞 7자리로 매칭 시도
  const prefix8 = regionCode.substring(0, 8);
  if (regionIntelDB[prefix8]) return regionIntelDB[prefix8];

  const prefix7 = regionCode.substring(0, 7);
  if (regionIntelDB[prefix7]) return regionIntelDB[prefix7];

  const prefix6 = regionCode.substring(0, 6); // 동지역 통합 매칭용
  if (regionIntelDB[prefix6]) return regionIntelDB[prefix6];

  return null;
};
