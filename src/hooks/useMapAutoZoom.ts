import { useEffect, useRef, useLayoutEffect } from 'react';
import type { GeoPath } from 'd3-geo';
import type { RegionCollection } from '../types/geo';

interface UseMapAutoZoomProps {
  gameState: string;
  selectedChapter: string | null;
  width: number;
  height: number;
  zoomTo: (t: { x: number; y: number; k: number }) => void;
  mapData: RegionCollection | null;
  level1Data: RegionCollection | null;  // 경기도 시 단위 병합 데이터 (overview fit용)
  pathGenerator: GeoPath;
}

/** data 컬렉션 전체의 화면 바운딩 박스를 계산해 zoomTo로 fit */
function fitCollectionToScreen(
  collection: RegionCollection,
  pathGenerator: GeoPath,
  width: number,
  height: number,
  padding: number,
  maxScale: number,
  zoomTo: (t: { x: number; y: number; k: number }) => void
) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;

  for (const feature of collection.features) {
    const [[fx0, fy0], [fx1, fy1]] = pathGenerator.bounds(feature);
    if (fx0 < x0) x0 = fx0;
    if (fy0 < y0) y0 = fy0;
    if (fx1 > x1) x1 = fx1;
    if (fy1 > y1) y1 = fy1;
  }

  if (!isFinite(x0) || !isFinite(y0)) return;

  const bw = x1 - x0, bh = y1 - y0;
  if (bw === 0 || bh === 0) return;

  const scale = Math.min(
    (width  - padding * 2) / bw,
    (height - padding * 2) / bh,
    maxScale
  );
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  zoomTo({ x: width / 2 - scale * cx, y: height / 2 - scale * cy, k: scale });
}

export function useMapAutoZoom({
  gameState,
  selectedChapter,
  width,
  height,
  zoomTo,
  mapData,
  level1Data,
  pathGenerator,
}: UseMapAutoZoomProps) {
  const mapDataRef    = useRef(mapData);
  const level1DataRef = useRef(level1Data);
  const pathGeneratorRef = useRef(pathGenerator);

  useLayoutEffect(() => { mapDataRef.current    = mapData;       }, [mapData]);
  useLayoutEffect(() => { level1DataRef.current = level1Data;    }, [level1Data]);
  useLayoutEffect(() => { pathGeneratorRef.current = pathGenerator; }, [pathGenerator]);

  // 1. REGION_SELECT / INITIAL → 경기도 전체가 화면에 딱 맞도록 fit
  const prevGameStateRef = useRef<string | null>(null);
  useEffect(() => {
    if (!width || !height) return;
    const prev = prevGameStateRef.current;
    prevGameStateRef.current = gameState;

    if (
      prev !== gameState &&
      (gameState === 'REGION_SELECT' || gameState === 'GAME_MODE_SELECT' || gameState === 'INITIAL')
    ) {
      const overview = level1DataRef.current ?? mapDataRef.current;
      if (overview?.features?.length) {
        fitCollectionToScreen(overview, pathGeneratorRef.current, width, height, 60, 8, zoomTo);
      } else {
        // 데이터 없으면 중심만 맞춤
        zoomTo({ x: 0, y: 0, k: 1 });
      }
    }
  }, [gameState, width, height, zoomTo]);

  // 2. PLAYING / SUBREGION_SELECT → 선택한 챕터(시/군) bbox로 줌인
  useEffect(() => {
    if (!width || !height || (gameState !== 'PLAYING' && gameState !== 'SUBREGION_SELECT') || !selectedChapter) return;

    const md = mapDataRef.current;
    const pg = pathGeneratorRef.current;
    if (!md?.features?.length) return;

    fitCollectionToScreen(md, pg, width, height, 60, 8, zoomTo);
  }, [gameState, selectedChapter, width, height, zoomTo]);
}
