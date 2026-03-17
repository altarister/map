export type OrderVolume = '하' | '중하' | '중' | '중상' | '상' | '최상';

export interface RegionIntel {
  regionCode: string;
  name: string;
  parentName: string; // 상위구역 (예: 여주시)
  roads: string[]; // 방면 및 연결 도로
  orderVolume: OrderVolume; // 오더 수
  importance: number; // 중요도 (1~5 별점)
  fieldTips: string[]; // 특징 및 실전 팁
  landmarks?: string[]; // 주요 랜드마크 (역, 구청, 터미널, 대형 마트 등)
}

// Key is regionCode
export type RegionIntelDatabase = Record<string, RegionIntel>;
