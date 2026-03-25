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
  selectionLevel?: 'PROVINCE' | 'CITY' | 'DISTRICT' | 'DONG';
  currentFocusCode?: string | null;
  level1Data?: any;
  cityData?: any;
  focusRegionCodes?: string[]; // 2단계 등 여러 지역 코드를 한 번에 타겟팅할 때 사용
}

export function useMapAutoZoom({
  gameState,
  selectedChapter,
  width,
  height,
  zoomTo,
  mapData,
  pathGenerator,
  selectionLevel,
  currentFocusCode,
  level1Data,
  cityData,
  focusRegionCodes
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

  // 2. REGION_SELECT 상태에서의 4단계 선택 동기화 줌 로직
  useEffect(() => {
    if (gameState !== 'REGION_SELECT' || !width || !height) return;

    if (selectionLevel === 'PROVINCE' || !currentFocusCode) {
      // PROVINCE 단계면 전체 줌인
      // 애니메이션 중복 충돌을 방지하기 위해 현재 k !== 1 일때만 쏘는 방어코드 추가 가능
      zoomTo({ x: 0, y: 0, k: 1 });
      return;
    }

    let feature: any = null;
    if (selectionLevel === 'CITY') {
      feature = level1Data?.features.find((f: any) => f.properties.code === currentFocusCode);
    } else if (selectionLevel === 'DISTRICT') {
      feature = cityData?.features.find((f: any) => f.properties.code === currentFocusCode);
    }

    if (feature) {
      const bounds = pathGeneratorRef.current?.bounds(feature);
      if (bounds && bounds[0] && bounds[1]) {
        const [[x0, y0], [x1, y1]] = bounds;
        const dx = x1 - x0;
        const dy = y1 - y0;
        const x = (x0 + x1) / 2;
        const y = (y0 + y1) / 2;
        const scale = Math.max(1, Math.min(12, 0.8 / Math.max(dx / width, dy / height)));
        zoomTo({ x: width / 2 - scale * x, y: height / 2 - scale * y, k: scale });
      }
    }
  }, [selectionLevel, currentFocusCode, gameState, width, height, zoomTo, level1Data, cityData]);

  // 3. 게임 플레이 시, 그리고 3-Depth 상세지역 선택 시, 유저가 선택한 챕터(시/군) 바운딩 박스를 계산해 자동 줌인
  useEffect(() => {
    if (!width || !height || (gameState !== 'PLAYING' && gameState !== 'SUBREGION_SELECT') || !selectedChapter) return;

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

  // 4. 여러 지역 동시 포커싱 (2단계 배차 모드 등)
  // 배열 참조 대신 내부 값이 변경될 때만 트리거하기 위해 문자열 직렬화 사용
  const focusCodesString = focusRegionCodes?.slice().sort().join(',') || '';

  useEffect(() => {
    if (!width || !height || !focusCodesString) return;

    const md = mapDataRef.current;
    const pg = pathGeneratorRef.current;
    if (!md?.features?.length) return;

    const codesToFocus = focusCodesString.split(',');
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    
    // 타겟 지역 필터링
    const targetFeatures = md.features.filter(f => codesToFocus.includes(f.properties.code));
    if (targetFeatures.length === 0) return;

    for (const feature of targetFeatures) {
      const bounds = pg.bounds(feature);
      if (bounds && bounds[0] && bounds[1]) {
         const [[fx0, fy0], [fx1, fy1]] = bounds;
         if (fx0 < x0) x0 = fx0;
         if (fy0 < y0) y0 = fy0;
         if (fx1 > x1) x1 = fx1;
         if (fy1 > y1) y1 = fy1;
      }
    }

    if (!isFinite(x0) || !isFinite(y0)) return;

    // 패딩을 더 넓게 주어 경로 선이 잘리지 않도록 하고, 현위치 주변 시야를 확보합니다.
    const padding = 120;
    const bw = x1 - x0, bh = y1 - y0;
    if (bw === 0 || bh === 0) return;

    // 최대 확대 비율(scale)을 8에서 4.5로 낮추어 부담스러운 초근접 줌을 방지합니다.
    const scale = Math.min((width - padding * 2) / bw, (height - padding * 2) / bh, 4.5);
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;

    zoomTo({ x: width / 2 - scale * cx, y: height / 2 - scale * cy, k: scale });

  }, [focusCodesString, width, height, zoomTo]);
}
