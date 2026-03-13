import { useEffect, useRef, useLayoutEffect } from 'react';
import type { GeoProjection } from 'd3-geo';
import type { RegionCollection, RegionFeature } from '../types/geo';

interface UseMapAutoZoomProps {
  gameState: string;
  selectedChapter: string | null;
  width: number;
  height: number;
  zoomTo: (t: { x: number; y: number; k: number }) => void;
  mapData: RegionCollection | null;
  cityData: RegionCollection | null;   // sig.json 경기도 시군구 (zoom 계산에 사용)
  level1Data: RegionCollection | null; // 미사용 (다른 CRS)
  projection: GeoProjection;           // useMapGeometry의 geoMercator projection
}

/**
 * ring mean centroid 계산 — 자기교차 폴리곤에서 geoCentroid가 잘못된 값을 반환하므로
 * 첫번째 ring의 좌표 평균을 사용
 */
function getRingMeanCentroid(feature: RegionFeature): [number, number] | null {
  const geom = feature.geometry;
  if (!geom) return null;
  let ring: number[][];
  if (geom.type === 'Polygon') {
    ring = (geom as any).coordinates?.[0];
  } else if (geom.type === 'MultiPolygon') {
    ring = (geom as any).coordinates?.[0]?.[0];
  } else {
    return null;
  }
  if (!ring?.length) return null;
  const lon = ring.reduce((s: number, [x]: number[]) => s + x, 0) / ring.length;
  const lat = ring.reduce((s: number, [, y]: number[]) => s + y, 0) / ring.length;
  if (!isFinite(lon) || !isFinite(lat)) return null;
  // 경기도 합리적 범위 체크
  if (lon < 126.0 || lon > 129.0 || lat < 36.0 || lat > 39.0) return null;
  return [lon, lat];
}

export function useMapAutoZoom({
  gameState,
  selectedChapter,
  width,
  height,
  zoomTo,
  cityData,
  projection,
}: UseMapAutoZoomProps) {
  const projRef = useRef(projection);
  useLayoutEffect(() => { projRef.current = projection; }, [projection]);

  const cityDataRef = useRef(cityData);
  useLayoutEffect(() => { cityDataRef.current = cityData; }, [cityData]);

  // 1. REGION_SELECT / INITIAL → k=1 리셋
  // projection.center=[127.225,37.59], scale=43407이므로
  // k=1, x=0, y=0이 정확히 경기도 전체 뷰 (projection 자체의 translate가 화면 중앙을 잡음)
  const prevGameStateRef = useRef<string | null>(null);
  useEffect(() => {
    if (!width || !height) return;
    const prev = prevGameStateRef.current;
    prevGameStateRef.current = gameState;

    if (
      prev !== gameState &&
      (gameState === 'REGION_SELECT' || gameState === 'GAME_MODE_SELECT' || gameState === 'INITIAL')
    ) {
      zoomTo({ x: 0, y: 0, k: 1 });
    }
  }, [gameState, width, height, zoomTo]);

  // 2. PLAYING / SUBREGION_SELECT → selectedChapter에 해당하는 시/군 중심으로 줌인
  const prevChapterRef = useRef<string | null>(null);
  useEffect(() => {
    if (!width || !height) return;
    if (gameState !== 'PLAYING' && gameState !== 'SUBREGION_SELECT') return;
    if (!selectedChapter) return;

    // 같은 챕터면 스킵
    if (prevChapterRef.current === selectedChapter) return;
    prevChapterRef.current = selectedChapter;

    const proj = projRef.current;
    const cityFeatures = cityDataRef.current?.features ?? [];

    // selectedChapter는 시/군의 SIG_CD (5자리). 구 있는 시는 parent code (앞4자리+'0')
    // cityData에서 code가 selectedChapter로 시작하는 첫번째 feature 찾기
    const chapterPrefix = selectedChapter.substring(0, 4);
    const matchFeatures = cityFeatures.filter((f: RegionFeature) =>
      String((f.properties as any).code ?? '').startsWith(chapterPrefix)
    );

    if (!matchFeatures.length) {
      // fallback: 전체 경기도 뷰
      zoomTo({ x: 0, y: 0, k: 1 });
      return;
    }

    // ring mean centroid의 평균 → 시/군 전체 중심
    let sumX = 0, sumY = 0, n = 0;
    matchFeatures.forEach((f: RegionFeature) => {
      const centroid = getRingMeanCentroid(f);
      if (!centroid) return;
      const [px, py] = proj(centroid) ?? [];
      if (isFinite(px) && isFinite(py)) { sumX += px; sumY += py; n++; }
    });

    if (n === 0) {
      zoomTo({ x: 0, y: 0, k: 1 });
      return;
    }

    const cx = sumX / n, cy = sumY / n;
    const k = 7; // 시/군 단위 적절 줌 레벨
    zoomTo({ x: width / 2 - k * cx, y: height / 2 - k * cy, k });
  }, [gameState, selectedChapter, width, height, zoomTo]);
}
