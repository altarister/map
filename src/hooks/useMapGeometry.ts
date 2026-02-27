import { useMemo } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import type { GeoPath } from 'd3-geo';
import type { RegionCollection, RegionFeature } from '../types/geo';

interface UseMapGeometryProps {
  fullMapData: RegionCollection | null;
  mapData: RegionCollection | null;
  cityData: RegionCollection | null;
  width: number;
  height: number;
}

export function useMapGeometry({
  fullMapData,
  mapData,
  cityData,
  width,
  height,
}: UseMapGeometryProps) {
  // 1. Projection (투영법) 설정
  const projection = useMemo(() => {
    const proj = geoMercator();
    if ((fullMapData?.features?.length ?? 0) > 0) {
      proj.fitExtent(
        [
          [50, 50],
          [width - 50, height - 50],
        ],
        fullMapData as RegionCollection
      );
    } else {
      proj.center([127.17, 37.45]).scale(60000).translate([width / 2, height / 2]);
    }
    return proj;
  }, [fullMapData, width, height]);

  // 2. Path Generator 생성
  const pathGenerator: GeoPath = useMemo(() => geoPath().projection(projection), [projection]);

  // 3. 파생 데이터: 현재 렌더링 대상 Features
  const features: RegionFeature[] = useMemo(() => mapData?.features ?? [], [mapData]);

  // 4. 면적 사전 계산 (라벨 스케일 조정 등 계산 부하 방지용)
  const featureAreas = useMemo(() => {
    const areas: Record<string, number> = {};
    features.forEach((f) => {
      if (f.properties?.code) areas[f.properties.code] = pathGenerator.area(f);
    });
    cityData?.features?.forEach((f) => {
      if (f.properties?.code) areas[f.properties.code] = pathGenerator.area(f);
    });
    return areas;
  }, [features, cityData, pathGenerator]);

  // 5. 파생 데이터: 읍면동이 속한 상위 시/군(Level 2) Features 추출
  const filteredCityFeatures: RegionFeature[] = useMemo(() => {
    if (!cityData || features.length === 0) return [];
    // 법정동 코드의 앞 5자리는 시/군/구를 뜻함 (e.g. 41110)
    const activePrefixes = new Set(features.map((f) => f.properties.code.substring(0, 5)));
    return cityData.features.filter((f) => activePrefixes.has(f.properties.code));
  }, [cityData, features]);

  return {
    projection,
    pathGenerator,
    features,
    featureAreas,
    filteredCityFeatures,
  };
}
