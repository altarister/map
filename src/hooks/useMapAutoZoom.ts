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
  pathGenerator: GeoPath;
}

export function useMapAutoZoom({
  gameState,
  selectedChapter,
  width,
  height,
  zoomTo,
  mapData,
  pathGenerator,
}: UseMapAutoZoomProps) {
  // 클로저의 오래된 값을 방지하기 위해 Refs 사용
  const mapDataRef = useRef(mapData);
  const pathGeneratorRef = useRef(pathGenerator);
  
  useLayoutEffect(() => {
    mapDataRef.current = mapData;
  }, [mapData]);
  
  useLayoutEffect(() => {
    pathGeneratorRef.current = pathGenerator;
  }, [pathGenerator]);

  // 1. 메뉴 상태 (로비) 진입 시 맵 전체가 보이도록 초기 줌 스케일로 회귀
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

  // 2. 게임 플레이 시, 유저가 선택한 특정 챕터(시/군)의 바운딩 박스를 계산해 자동 줌인
  useEffect(() => {
    if (!width || !height || gameState !== 'PLAYING' || !selectedChapter) return;

    const md = mapDataRef.current;
    const pg = pathGeneratorRef.current;
    if (!md?.features?.length) return;

    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
      
    for (const feature of md.features) {
      const [[fx0, fy0], [fx1, fy1]] = pg.bounds(feature);
      if (fx0 < x0) x0 = fx0;
      if (fy0 < y0) y0 = fy0;
      if (fx1 > x1) x1 = fx1;
      if (fy1 > y1) y1 = fy1;
    }

    if (!isFinite(x0) || !isFinite(y0)) return;

    const padding = 60;
    const bw = x1 - x0,
      bh = y1 - y0;
    if (bw === 0 || bh === 0) return;

    const scale = Math.min((width - padding * 2) / bw, (height - padding * 2) / bh, 8);
    const cx = (x0 + x1) / 2,
      cy = (y0 + y1) / 2;
      
    zoomTo({ x: width / 2 - scale * cx, y: height / 2 - scale * cy, k: scale });
  }, [gameState, selectedChapter, width, height, zoomTo]);
}
