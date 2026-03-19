import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { RegionIntel } from './intel';

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
  centroid?: [number, number]; // 중심점 좌표 (Lon, Lat)
  _isMergedCity?: boolean;     // 자식 구(Gu)들을 런타임 병합하여 만든 부모 도시 여부 (useGeoData 내부 사용)

  // 3. 인텔 병합 속성 (via scripts/merge_intel_to_geo.js)
  intel?: RegionIntel; // 배달 핵심 팁

}

export type RegionFeature = Feature<Geometry, RegionProperties>;
export type RegionCollection = FeatureCollection<Geometry, RegionProperties>;

// Road data (TopoJSON에서 변환된 GeoJSON — 별도 properties 없음)
export type RoadFeature = Feature<Geometry>;
export type RoadCollection = FeatureCollection<Geometry>;
