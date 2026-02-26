import { useRef, useMemo, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { getStageStrategy } from '../../game/stages/registry';
import { useMapScale } from '../../hooks/useMapScale';
import { useGame } from '../../contexts/GameContext';
import { useMapContext } from '../../contexts/MapContext';
import { useSettings } from '../../contexts/SettingsContext';
import { MapScale } from './MapScale';
import { RegionLabel } from './RegionLabel';
import { BaseMapLayerCanvas } from './BaseMapLayerCanvas';
import type { BaseMapLayerHandle } from './BaseMapLayerCanvas';
import { InteractionLayer } from './InteractionLayer';
import { RoadLayer } from './RoadLayer';
import type { RoadLayerHandle } from './RoadLayer';
import { useMapDimensions } from '../../hooks/useMapDimensions';
import { useMapStyles } from '../../hooks/useMapStyles';
import { useMapZoom } from '../../hooks/useMapZoom';
import { log } from '../../lib/debug';
import { IntelPopup } from './IntelPopup';
import { getAdjacentRegions, getPassingRoads } from '../../game/systems/IntelSystem';
import { MAP_THEME_COLORS } from '../../styles/themes';


export const Map = () => {
  // ── Context & Settings ──────────────────────────────────────────────────────
  const {
    mapData: fullMapData,
    filteredMapData: mapData,
    cityData,
    roadData,
    loading,
    error,
    gameState,
    checkAnswer,
    lastFeedback,
    answeredRegions,
    currentStage,
    startGame,
    selectedChapter,
  } = useGame();

  const { theme, showDebugInfo, viewOptions } = useSettings();
  const colors = MAP_THEME_COLORS[theme];
  const { setTransform, hoveredRegion, setHoveredRegion, layerVisibility } = useMapContext();
  const { scaleWidth, scaleDistance, scaleUnit, handleMove } = useMapScale();

  // ── Dimensions ──────────────────────────────────────────────────────────────
  const containerNodeRef = useRef<HTMLDivElement | null>(null);
  const { ref: containerRefCallback, width, height } = useMapDimensions<HTMLDivElement>();
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    containerNodeRef.current = node;
    containerRefCallback(node);
  }, [containerRefCallback]);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const roadLayerRef = useRef<RoadLayerHandle | null>(null);
  const baseMapLayerRef = useRef<BaseMapLayerHandle | null>(null);

  // ── Zoom ────────────────────────────────────────────────────────────────────
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  const handleZoomStart = useCallback(() => {
    // 사용자가 새로운 줌/팬 인터랙션을 시작할 때만, 떠 있던 배경판(클론) 일괄 삭제
    document.querySelectorAll('#zoom-crossfade-snapshot').forEach(el => el.remove());
    // 진행 중이던 페이드인 효과 즉시 중단 및 불투명 100% 복구 (반투명 줌 방지)
    if (canvasWrapperRef.current) {
        canvasWrapperRef.current.style.transition = 'none';
        canvasWrapperRef.current.style.opacity = '1';
    }
  }, []);

  const handleZoom = useCallback((t: { x: number; y: number; k: number }) => {
    setTransform(t);
    handleMove({ zoom: t.k });
  }, [setTransform, handleMove]);

  const handleMomentumStart = useCallback(() => {
    // 관성 스크롤 중 Dim 처리를 제거하여 크로스페이드와의 투명도 충돌(깜빡임) 방지
  }, []);

  const handleCrossfadeStart = useCallback(() => {
    // 줌 완료 직전 DOM 스냅샷 찍어 디졸브 오버레이 생성
    const node = containerNodeRef.current;
    if (!canvasWrapperRef.current || !node) return;

    // --- 1. 상위(clone) 스냅샷 생성 및 1.0 초기화 ---
    const realWrapper = canvasWrapperRef.current;
    
    // 연속 실행 방지: 혹시 남아있는 이전 스냅샷이 있다면 모두 제거 (화면 하얘짐 방지)
    document.querySelectorAll('#zoom-crossfade-snapshot').forEach(el => el.remove());

    const clone = realWrapper.cloneNode(true) as HTMLDivElement;
    clone.id = 'zoom-crossfade-snapshot';
    clone.style.position = 'absolute';
    clone.style.inset = '0';
    clone.style.pointerEvents = 'none';
    clone.style.transition = 'none'; // 스냅샷은 배경판 역할이므로 평생 트랜지션 없음
    clone.style.opacity = '1'; // 100% 불투명한 든든한 배경판 역할
    clone.style.zIndex = '0'; // UI(SVG) 레이어보다 낮게 설정

    // 캔버스 픽셀 복사
    const originalCanvases = realWrapper.querySelectorAll('canvas');
    const clonedCanvases = clone.querySelectorAll('canvas');
    originalCanvases.forEach((origNode, index) => {
        const orig = origNode as HTMLCanvasElement;
        const dest = clonedCanvases[index] as HTMLCanvasElement;
        if (orig && dest) {
            dest.getContext('2d')?.drawImage(orig, 0, 0);
        }
    });

    // 진짜 캔버스의 바로 앞(밑장)에 삽입하여, 진짜 캔버스가 그 위를 덮으며 나타날 수 있게 함
    if (realWrapper.parentNode) {
        realWrapper.parentNode.insertBefore(clone, realWrapper);
    } else {
        node.appendChild(clone);
    }

    // --- 2. 진짜 캔버스 (새 지도) 숨기기 ---
    // 진짜 캔버스는 초기엔 투명 상태로 숨겨두고 뒤에서 새로 그려지게 냅둠
    realWrapper.style.transition = 'none';
    realWrapper.style.opacity = '0';

    // --- 3. 50ms 후, 진짜 캔버스만 서서히 불투명해지도록 (Fade-In) ---
    // 아래에 스냅샷(과거 지도)이 100% 버티고 있으므로, 빈 영역이나 고해상도 지도가 이질감 없이 슥 나타남!
    setTimeout(() => {
        if (!realWrapper) return;
        realWrapper.style.transition = 'opacity 400ms ease-out';
        realWrapper.style.opacity = '1';

        clone.style.transition = 'opacity 800ms ease-out';
        clone.style.opacity = '0';
    }, 50);

    // --- 4. 2050ms 애니메이션 완료 후 스냅샷 찌꺼기 제거 ---
    setTimeout(() => {
        if (clone && clone.parentNode) clone.parentNode.removeChild(clone);
        if (realWrapper) realWrapper.style.transition = ''; // 찌꺼기 제거
    }, 4100);

  }, []);

  const { svgRef, gRef, transform: zoomTransform, zoomTo } = useMapZoom({
    width,
    height,
    onZoom: handleZoom,
    onZoomStart: handleZoomStart,
    onMomentumStart: handleMomentumStart,
    onCrossfadeStart: handleCrossfadeStart,
    canvasLayerRefs: [baseMapLayerRef, roadLayerRef],
  });

  // ── Projection & Path Generator ─────────────────────────────────────────────
  const projection = useMemo(() => {
    const proj = geoMercator();
    if ((fullMapData?.features?.length ?? 0) > 0) {
      proj.fitExtent([[50, 50], [width - 50, height - 50]], fullMapData as any);
    } else {
      proj.center([127.17, 37.45]).scale(60000).translate([width / 2, height / 2]);
    }
    return proj;
  }, [fullMapData, width, height]);

  const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);

  // ── Derived Map Data ────────────────────────────────────────────────────────
  const features = mapData?.features || [];

  const { getFillColor, getStrokeColor } = useMapStyles({
    lastFeedback,
    answeredRegions,
  });

  const featureAreas = useMemo(() => {
    const areas: Record<string, number> = {};
    features.forEach((f: any) => f.properties?.code && (areas[f.properties.code] = pathGenerator.area(f)));
    cityData?.features?.forEach((f: any) => f.properties?.code && (areas[f.properties.code] = pathGenerator.area(f)));
    return areas;
  }, [features, cityData, pathGenerator]);

  const filteredCityFeatures = useMemo(() => {
    if (!cityData || features.length === 0) return [];
    const activePrefixes = new Set(features.map((f: any) => f.properties.code.substring(0, 5)));
    return cityData.features.filter((f: any) => activePrefixes.has(f.properties.code));
  }, [cityData, features]);

  const isSingleRegion = filteredCityFeatures.length === 1;
  const stageConfig = useMemo(() => getStageStrategy(currentStage).config, [currentStage]);
  const forceShowTowns = stageConfig.mapOptions?.forceShowTownGeometry ?? false;
  // 지역 선택 전(REGION_SELECT) 화면에서는 무조건 시/군/구 큰 단위만 렌더링해야 함 (렉 방지 & 시군구 클릭 유도)
  const showTownGeometry = gameState !== 'REGION_SELECT' && (forceShowTowns || isSingleRegion || zoomTransform.k >= 1.5);
  const featuresToRender = showTownGeometry ? features : filteredCityFeatures;
  const showDistrictLabels = isSingleRegion || zoomTransform.k >= 1.5;

  // ── Auto-Zoom: Refs로 최신 mapData/pathGenerator 추적 (클로저 stale값 방지) ──
  const mapDataRef = useRef(mapData);
  const pathGeneratorRef = useRef(pathGenerator);
  useLayoutEffect(() => { mapDataRef.current = mapData; }, [mapData]);
  useLayoutEffect(() => { pathGeneratorRef.current = pathGenerator; }, [pathGenerator]);

  // ── Auto-Zoom: 메뉴 상태 진입 시 줌 초기화 ─────────────────────────────────
  const prevGameStateRef = useRef<string | null>(null);
  useEffect(() => {
    if (!width || !height) return;
    const prev = prevGameStateRef.current;
    prevGameStateRef.current = gameState;
    if (prev !== gameState &&
        (gameState === 'REGION_SELECT' || gameState === 'GAME_MODE_SELECT' || gameState === 'INITIAL')) {
      zoomTo({ x: 0, y: 0, k: 1 });
    }
  }, [gameState, width, height, zoomTo]);

  // ── Auto-Zoom: PLAYING + selectedChapter 변경 시 해당 지역으로 줌인 ────────
  useEffect(() => {
    if (!width || !height || gameState !== 'PLAYING' || !selectedChapter) return;

    const md = mapDataRef.current;
    const pg = pathGeneratorRef.current;
    if (!md?.features?.length) return;

    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const feature of md.features) {
      const [[fx0, fy0], [fx1, fy1]] = pg.bounds(feature);
      if (fx0 < x0) x0 = fx0;
      if (fy0 < y0) y0 = fy0;
      if (fx1 > x1) x1 = fx1;
      if (fy1 > y1) y1 = fy1;
    }

    if (!isFinite(x0) || !isFinite(y0)) return;

    const padding = 60;
    const bw = x1 - x0, bh = y1 - y0;
    if (bw === 0 || bh === 0) return;

    const scale = Math.min((width - padding * 2) / bw, (height - padding * 2) / bh, 8);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    zoomTo({ x: width / 2 - scale * cx, y: height / 2 - scale * cy, k: scale });
  }, [gameState, selectedChapter, width, height, zoomTo]);

  // ── Event Handlers ──────────────────────────────────────────────────────────
  const [intelPopup, setIntelPopup] = useState<{ x: number; y: number; data: any } | null>(null);

  const handleRegionContextMenu = useCallback((event: React.MouseEvent, region: any) => {
    event.preventDefault();
    const neighbors = getAdjacentRegions(region, featuresToRender);
    const roads = roadLayerRef.current
      ? roadLayerRef.current.findRoads(region)
      : getPassingRoads(region, roadData?.features || []);
    setIntelPopup({
      x: event.clientX,
      y: event.clientY,
      data: { regionName: region.properties.name, neighbors, roads },
    });
  }, [featuresToRender, roadData]);

  const closeIntelPopup = useCallback(() => setIntelPopup(null), []);

  const handleRegionClick = useCallback((code: string) => {
    if (gameState === 'REGION_SELECT') {
      log.game(`[Map] Selected Region: ${code}`);
      startGame(code.substring(0, 5));
      return;
    }
    if (gameState !== 'PLAYING') return;
    if (!forceShowTowns && !showTownGeometry) {
      log.game('[Map] Cannot answer: zoom in to see towns.');
      return;
    }
    checkAnswer({ type: 'MAP_CLICK', regionCode: code });
  }, [gameState, forceShowTowns, showTownGeometry, startGame, checkAnswer]);

  // ── Early Returns ───────────────────────────────────────────────────────────
  if (loading) return <div className="flex justify-center items-center h-full text-gray-400 font-mono">Loading map...</div>;
  if (error)   return <div className="text-red-500 flex justify-center items-center h-full font-mono">Error: {error.message}</div>;
  if (!mapData || !cityData) return <div className="flex justify-center items-center h-full text-gray-400 font-mono">No map data</div>;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden ${layerVisibility.grid ? 'map-grid' : 'bg-background'}`}
      onClick={closeIntelPopup}
    >
      {/* Canvas 레이어 래퍼: 스냅샷 복제를 위해 ref 할당 */}
      <div
        ref={canvasWrapperRef}
        style={{
          position: 'absolute', inset: 0,
        }}
      >
        {/* Layer 1: Base Map (Canvas) */}
        <BaseMapLayerCanvas
          ref={baseMapLayerRef}
          features={featuresToRender}
          cityData={cityData}
          projection={projection}
          theme={theme}
          themeColors={colors}
          initialTransform={zoomTransform}
          width={width}
          height={height}
          answeredRegions={answeredRegions}
          lastFeedback={lastFeedback}
          showBoundaries={layerVisibility.boundaries}
        />

        {/* Layer 2: Roads (Canvas) */}
        {roadData && (
          <RoadLayer
            ref={roadLayerRef}
            features={roadData.features}
            projection={projection}
            initialTransform={zoomTransform}
            width={width}
            height={height}
            theme={theme}
            visibleMotorway={layerVisibility.roadMotorway}
            visibleTrunk={layerVisibility.roadTrunk}
            visiblePrimary={layerVisibility.roadPrimary}
            visibleSecondary={layerVisibility.roadSecondary}
            visibleOther={layerVisibility.roadOther}
          />
        )}
      </div>

      {/* Layer 3: Interaction & Overlays */}
      <svg
        ref={svgRef}
        width="100%" height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0"
        style={{ zIndex: 20 }}
      >
        {/* InteractionLayer: gRef 내부 (CSS zoom transform 적용됨) */}
        <g ref={gRef} style={{ willChange: 'transform' }}>
          <InteractionLayer
            features={featuresToRender}
            pathGenerator={pathGenerator}
            gameState={gameState}
            showTownGeometry={showTownGeometry}
            onRegionHover={setHoveredRegion}
            answeredRegions={answeredRegions}
            onRegionContextMenu={handleRegionContextMenu}
            onRegionClick={handleRegionClick}
          />

          {/* Visual Overlays: Hover, Selection, Feedback */}
          <g style={{ pointerEvents: 'none' }}>
            {hoveredRegion && (gameState === 'PLAYING' || gameState === 'REGION_SELECT') && !answeredRegions.has(hoveredRegion) && (
              <path
                d={pathGenerator(featuresToRender.find((f: any) => f.properties.code === hoveredRegion) as any) || ''}
                fill={getFillColor(hoveredRegion, true)}
                fillOpacity={0.8}
                stroke={getStrokeColor(hoveredRegion, true)}
                strokeWidth={1.5 / zoomTransform.k}
                className="transition-all duration-200"
                style={{ mixBlendMode: 'multiply' }}
              />
            )}

            {/* 정답/오답 피드백 오버레이 */}
            {lastFeedback && (lastFeedback as any).feature && (
              <path
                d={pathGenerator((lastFeedback as any).feature) || ''}
                fill={getFillColor(lastFeedback.regionCode, false)}
                fillOpacity={0.7}
                stroke={getStrokeColor(lastFeedback.regionCode, false)}
                strokeWidth={2 / zoomTransform.k}
                className="transition-all duration-300"
              />
            )}
          </g>
          {/* 라벨: gRef 내부. CSS scale(k)로 위치 보정, font-size=14/k로 크기 상쇄.
              setTransform이 매 zoom 프레임 호출되므로 k값이 항상 최신 → 스냅 없음. */}
          {(gameState === 'PLAYING' || gameState === 'REGION_SELECT') && layerVisibility.labels && (
            <>
              {!showDistrictLabels && filteredCityFeatures.map((feature: any) => (
                <RegionLabel
                  key={`label-city-${feature.properties.code}`}
                  feature={feature}
                  projection={projection}
                  transform={zoomTransform}
                  answeredRegions={answeredRegions}
                  lastFeedback={lastFeedback}
                  gameState={gameState}
                  fontScale={gameState === 'REGION_SELECT' ? 0.9 : 1.5}
                  baseArea={featureAreas[feature.properties.code] || 0}
                />
              ))}
              {showDistrictLabels && featuresToRender.map((feature: any) => (
                <RegionLabel
                  key={`label-district-${feature.properties.code}`}
                  feature={feature}
                  projection={projection}
                  transform={zoomTransform}
                  answeredRegions={answeredRegions}
                  lastFeedback={lastFeedback}
                  gameState={gameState}
                  fontScale={1.0}
                  baseArea={featureAreas[feature.properties.code] || 0}
                />
              ))}
            </>
          )}
        </g>
      </svg>

      {intelPopup && (
        <IntelPopup
          x={intelPopup.x}
          y={intelPopup.y}
          data={intelPopup.data}
          onClose={closeIntelPopup}
        />
      )}

      {viewOptions.showScaleBar && gameState !== 'INITIAL' && (
        <MapScale
          width={scaleWidth}
          distance={scaleDistance}
          unit={scaleUnit}
          zoom={zoomTransform.k}
          hoveredRegion={featuresToRender.find((f: any) => f.properties.code === hoveredRegion)?.properties.name}
          renderedCount={featuresToRender.length}
          showDebug={showDebugInfo}
        />
      )}

      {!showTownGeometry && gameState === 'PLAYING' && !forceShowTowns && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 glass-panel text-white px-4 py-2 rounded-full text-xs font-mono">
          [확대하여 지역 탐색]
        </div>
      )}
    </div>
  );
};
