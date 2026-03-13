import { useEffect, useRef, useLayoutEffect } from 'react';
import { geoPath } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import type { RegionCollection, RegionFeature } from '../types/geo';

interface UseMapAutoZoomProps {
  gameState: string;
  selectedChapter: string | null;
  width: number;
  height: number;
  zoomTo: (t: { x: number; y: number; k: number }) => void;
  mapData: RegionCollection | null;
  cityData: RegionCollection | null;
  level1Data: RegionCollection | null;
  projection: GeoProjection;
}

/**
 * Cartesian bounds로 bbox 계산 → 화면에 fit
 * projection(null) = 구면 기하학 없이 순수 lon/lat 좌표로 bbox 계산
 * 이후 그 bbox를 실제 projection으로 변환해 zoom 계산
 */
function fitFeaturesToScreen(
  features: RegionFeature[],
  projection: GeoProjection,
  width: number,
  height: number,
  padding: number,
  maxScale: number,
  zoomTo: (t: { x: number; y: number; k: number }) => void
) {
  if (!features.length) return;

  // Cartesian bounds: lon/lat 범위
  const flatPath = geoPath().projection(null);
  const [[lonMin, latMin], [lonMax, latMax]] = flatPath.bounds({
    type: 'FeatureCollection',
    features,
  } as RegionCollection);

  if (!isFinite(lonMin) || !isFinite(lonMax)) return;

  // lon/lat 중심을 projection으로 변환
  const lonCenter = (lonMin + lonMax) / 2;
  const latCenter = (latMin + latMax) / 2;
  const projected = projection([lonCenter, latCenter]);
  if (!projected) return;
  const [cx, cy] = projected;

  // bbox 네 코너를 projection으로 변환해서 화면 픽셀 범위 계산
  const corners = [
    [lonMin, latMin], [lonMax, latMin],
    [lonMin, latMax], [lonMax, latMax],
  ] as [number, number][];

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of corners) {
    const p = projection(c);
    if (!p) continue;
    const [px, py] = p;
    if (!isFinite(px) || !isFinite(py)) continue;
    if (px < x0) x0 = px; if (px > x1) x1 = px;
    if (py < y0) y0 = py; if (py > y1) y1 = py;
  }

  const bw = x1 - x0, bh = y1 - y0;
  if (bw <= 0 || bh <= 0) return;

  const scale = Math.min(
    (width  - padding * 2) / bw,
    (height - padding * 2) / bh,
    maxScale
  );

  if (!isFinite(scale) || scale <= 0) return;

  zoomTo({ x: width / 2 - scale * cx, y: height / 2 - scale * cy, k: scale });
}

export function useMapAutoZoom({
  gameState,
  selectedChapter,
  width,
  height,
  zoomTo,
  mapData,
  cityData,
  projection,
}: UseMapAutoZoomProps) {
  const projRef = useRef(projection);
  useLayoutEffect(() => { projRef.current = projection; }, [projection]);

  const cityDataRef = useRef(cityData);
  useLayoutEffect(() => { cityDataRef.current = cityData; }, [cityData]);

  // fullMapData ref — REGION_SELECT overview fit용
  const mapDataRef = useRef(mapData);
  useLayoutEffect(() => { mapDataRef.current = mapData; }, [mapData]);

  // 1. REGION_SELECT / INITIAL → 전체 경기도 overview fit
  const prevGameStateRef = useRef<string | null>(null);
  useEffect(() => {
    if (!width || !height) return;
    const prev = prevGameStateRef.current;
    prevGameStateRef.current = gameState;

    if (
      prev !== gameState &&
      (gameState === 'REGION_SELECT' || gameState === 'GAME_MODE_SELECT' || gameState === 'INITIAL')
    ) {
      // 전체 경기도(fullMapData 또는 cityData)로 overview fit
      // projection이 이미 fullMapData로 계산됐으므로 k=1, x=0, y=0이 경기도 전체 뷰
      // projection.translate=[0,0] 이므로 경기도 중심이 SVG (0,0)에 위치.
      // 화면 중앙으로 이동하려면 x=w/2, y=h/2
      zoomTo({ x: width / 2, y: height / 2, k: 1 });
    }
  }, [gameState, width, height, zoomTo]);

  // 2. PLAYING / SUBREGION_SELECT → selectedChapter 시/군으로 줌인
  const prevChapterRef = useRef<string | null>(null);
  useEffect(() => {
    if (!width || !height) return;
    if (gameState !== 'PLAYING' && gameState !== 'SUBREGION_SELECT') return;
    if (!selectedChapter) return;
    if (prevChapterRef.current === selectedChapter) return;
    prevChapterRef.current = selectedChapter;

    const proj = projRef.current;

    // cityData에서 selectedChapter에 해당하는 시/군 피처 찾기
    const chapterPrefix = selectedChapter.substring(0, 4);
    const cityFeatures = (cityDataRef.current?.features ?? []).filter((f: RegionFeature) =>
      String((f.properties as any).code ?? '').startsWith(chapterPrefix)
    );

    if (cityFeatures.length > 0) {
      fitFeaturesToScreen(cityFeatures, proj, width, height, 60, 8, zoomTo);
    } else {
      // fallback: mapData로 시도
      const mf = mapDataRef.current?.features;
      if (mf?.length) {
        fitFeaturesToScreen(mf, proj, width, height, 60, 8, zoomTo);
      }
    }
  }, [gameState, selectedChapter, width, height, zoomTo]);
}
