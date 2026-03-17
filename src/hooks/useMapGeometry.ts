import { useMemo } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import type { GeoPath } from 'd3-geo';
import type { RegionCollection, RegionFeature } from '../types/geo';

interface UseMapGeometryProps {
  fullMapData: RegionCollection | null;
  level1Data: RegionCollection | null;
  mapData: RegionCollection | null;
  cityData: RegionCollection | null;
  width: number;
  height: number;
}

export function useMapGeometry({
  fullMapData,
  level1Data,
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
    cityData?.features?.forEach((f: any) => {
      if (f.properties?.code) areas[f.properties.code] = pathGenerator.area(f);
    });
    level1Data?.features?.forEach((f: any) => {
      if (f.properties?.code) areas[f.properties.code] = pathGenerator.area(f);
    });
    return areas;
  }, [features, cityData, level1Data, pathGenerator]);

  // 5. 파생 데이터: 읍면동이 속한 상위 시/군(Level 2) Features 추출
  const filteredCityFeatures: RegionFeature[] = useMemo(() => {
    if (!cityData || features.length === 0) return [];

    // 법정동 코드 체계: 
    // 기본 시/군/구는 앞 5자리로 매칭 (예: 41110)
    // 단, 구(Gu)가 있는 시(예: 고양시 41280, 안산시 41270)의 하위 구들은 41281, 41285 등 5번째 자리가 0이 아님.
    // cityData의 상위 시 단위 폴리곤 코드는 보통 5번째 자리가 '0'으로 끝남.
    // 상위 시를 포함하기 위해 4자리 앞자리 + '0' 형태의 부모 코드도 함께 activePrefixes에 추가.
    const activePrefixes = new Set<string>();

    features.forEach((f) => {
      const prefix5 = f.properties.code.substring(0, 5);
      activePrefixes.add(prefix5);

      // 구(Gu)가 있는 시의 최상위 시(Si) 코드를 추론 (5번째 자리를 0으로 만듦)
      if (prefix5.endsWith('1') || prefix5.endsWith('3') || prefix5.endsWith('5') || prefix5.endsWith('7') || prefix5.endsWith('9')) {
        const parentCityCode = prefix5.substring(0, 4) + '0';
        activePrefixes.add(parentCityCode);
      }
    });

    return cityData.features.filter((f: any) => activePrefixes.has(f.properties.code));
  }, [cityData, features]);

  return {
    projection,
    pathGenerator,
    features,
    featureAreas,
    filteredCityFeatures,
  };
}
