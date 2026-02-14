import type { Feature, FeatureCollection, Geometry } from 'geojson';

export interface RegionProperties {
  // 1. GeoJSON 원본 속성 (Raw Data)
  code: string;       // 행정구역 코드 (예: "41461" 용인시 처인구, "41461253" 모현읍)
  name: string;       // 지역 이름 (예: "처인구", "모현읍")
  name_eng?: string;  // 영문 이름 (예: "Cheoin-gu", "Mohyeon-eup")
  base_year?: string; // 기준 연도 (예: "2018")

  // 2. 파생 속성 (Enriched Data via useGeoData)
  // Level 3(읍면동) 데이터에서 상위 행정구역 정보를 저장하기 위해 사용
  SIG_KOR_NM?: string; // 시군구 이름 (예: "용인시 처인구")
  EMD_KOR_NM?: string; // 읍면동 이름 (예: "모현읍")

  // Legacy (삭제 예정)
  city?: string;
  district?: string;
}

export type RegionFeature = Feature<Geometry, RegionProperties>;
export type RegionCollection = FeatureCollection<Geometry, RegionProperties>;
