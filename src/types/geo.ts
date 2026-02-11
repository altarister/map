import type { Feature, FeatureCollection, Geometry } from 'geojson';

export interface RegionProperties {
  name: string;      // "안산시 단원구"
  base_year?: string; 
  name_eng?: string;
  code: string;      // "41271"
  city?: string;     // "안산시" - 추후 파싱 필요할 수 있음
  district?: string; // "단원구" - 추후 파싱 필요할 수 있음
}

export type RegionFeature = Feature<Geometry, RegionProperties>;
export type RegionCollection = FeatureCollection<Geometry, RegionProperties>;
