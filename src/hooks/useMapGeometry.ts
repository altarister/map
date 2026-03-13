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
  // ─────────────────────────────────────────────────────────────────────────
  // 문제: 한국 정부 공식 GIS 데이터(emd.json, sig.json)는 D3의 구면 기하학이 요구하는
  //       GeoJSON right-hand rule(외부링 반시계 방향)을 따르지 않는 폴리곤이 다수 포함됨.
  //       → d3.fitExtent(), geoCentroid(), geoPath.bounds() 등이 잘못된 값을 반환.
  //         (예: fitExtent 결과 scale=113, geoCentroid=[−52°,−37°] 등)
  //
  // 해결: geoPath().projection(null).bounds()
  //       - projection(null) = 구면 기하학 없이 순수 Cartesian(lon/lat 직교좌표) 계산
  //       - 이 bbox로 geoMercator의 center/scale을 수동 설정
  const projection = useMemo(() => {
    const proj = geoMercator();

    if ((fullMapData?.features?.length ?? 0) > 0) {
      // Cartesian bounds: 구면 왜곡 없는 순수 위경도 범위
      const [[lonMin, latMin], [lonMax, latMax]] =
        geoPath().projection(null).bounds(fullMapData as RegionCollection);

      if (isFinite(lonMin) && isFinite(lonMax) && isFinite(latMin) && isFinite(latMax)) {
        const lonCenter = (lonMin + lonMax) / 2;
        const latCenter = (latMin + latMax) / 2;

        // Mercator에서 위도에 따른 y 스케일 왜곡을 고려한 올바른 scale 계산:
        // scale=1짜리 테스트 projection으로 실제 픽셀 span을 측정
        const testProj = geoMercator()
          .center([lonCenter, latCenter])
          .translate([0, 0])
          .scale(1);
        const [xLeft]  = testProj([lonMin, latCenter]) ?? [0, 0];
        const [xRight] = testProj([lonMax, latCenter]) ?? [0, 0];
        const [, yTop] = testProj([lonCenter, latMin]) ?? [0, 0];
        const [, yBot] = testProj([lonCenter, latMax]) ?? [0, 0];

        const spanX = xRight - xLeft;
        const spanY = Math.abs(yBot - yTop);

        if (spanX > 0 && spanY > 0) {
          const scale = Math.min(
            (width  - 100) / spanX,
            (height - 100) / spanY
          );
          // translate=[0,0]: canvas의 ctx.translate(offsetX=w/2,offsetY=h/2)가
          // 경기도 중심을 화면 중앙으로 이동시킴.
          // SVG는 zoom transform {x=0,y=0,k=1} 아래에 그려지고,
          // 경기도 중심이 (0,0)에 있으면 zoom {x=w/2, y=h/2}로 화면 중앙으로 이동 필요.
          // ※ REGION_SELECT useMapAutoZoom에서 zoomTo({x:w/2, y:h/2, k:1})을 호출해야 함
          proj
            .center([lonCenter, latCenter])
            .translate([0, 0])
            .scale(scale);
          return proj;
        }
      }
    }

    // fallback: 경기도 기본값 (translate=[0,0])
    proj.center([127.11, 37.59]).translate([0, 0]).scale(23182);
    return proj;
  }, [fullMapData, width, height]);

  // 2. Path Generator 생성
  const pathGenerator: GeoPath = useMemo(() => geoPath().projection(projection), [projection]);

  // 3. 파생 데이터: 현재 렌더링 대상 Features
  const features: RegionFeature[] = useMemo(() => mapData?.features ?? [], [mapData]);

  // 4. 면적 사전 계산 (라벨 스케일 조정 등 계산 부하 방지용)
  const featureAreas = useMemo(() => {
    const areaMap = new Map<string, number>();
    const flatFn = geoPath().projection(null);
    features.forEach((f) => {
      const area = flatFn.area(f);
      areaMap.set(f.properties.code, area);
    });
    cityData?.features?.forEach((f) => {
      const area = flatFn.area(f);
      areaMap.set(f.properties.code, area);
    });
    level1Data?.features?.forEach((f) => {
      const area = flatFn.area(f);
      areaMap.set(f.properties.code, area);
    });
    return areaMap;
  }, [features, cityData, level1Data, pathGenerator]);

  // 5. 도시 피처 필터 (게임 상태에 따라 렌더링 결정용)
  const filteredCityFeatures: RegionFeature[] = useMemo(
    () => cityData?.features ?? [],
    [cityData]
  );

  return { projection, pathGenerator, features, featureAreas, filteredCityFeatures };
}
