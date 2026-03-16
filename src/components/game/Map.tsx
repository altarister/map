/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState, useCallback, useMemo } from 'react';
import { getStageStrategy } from '../../game/stages/registry';
import { useMapScale } from '../../hooks/useMapScale';
import { useGame } from '../../contexts/GameContext';
import { useGeoContext } from '../../contexts/GeoDataContext';
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
import { useMapGeometry } from '../../hooks/useMapGeometry';
import { useMapAutoZoom } from '../../hooks/useMapAutoZoom';
import { useMapCrossfadeTransition } from '../../hooks/useMapCrossfadeTransition';
import { log } from '../../lib/debug';
import { IntelPopup } from './IntelPopup';
import { getAdjacentRegions, getPassingRoads } from '../../game/systems/IntelSystem';
import { MAP_THEME_COLORS } from '../../styles/themes';


export const Map = () => {
  // ── Context & Settings ──────────────────────────────────────────────────────
  const {
    gameState,
    checkAnswer,
    lastFeedback,
    answeredRegions,
    currentStage,
    isBasicMode,
    highlightRegions,
    startGame,
    isHintActive,
    currentQuestion,
  } = useGame();

  const {
    fullMapData,
    level1Data,
    filteredMapData: mapData,
    cityData,
    roadData,
    loading,
    error,
    selectedChapter,
  } = useGeoContext();

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

  const { handleZoomStart, handleCrossfadeStart } = useMapCrossfadeTransition({
    canvasWrapperRef,
    containerNodeRef,
  });

  const handleZoom = useCallback((t: { x: number; y: number; k: number }) => {
    setTransform(t);
    handleMove({ zoom: t.k });
  }, [setTransform, handleMove]);

  const handleTransformTick = useCallback((t: { x: number; y: number; k: number }, lastDrawn: { x: number; y: number; k: number }) => {
    baseMapLayerRef.current?.setCssTransform(t, lastDrawn);
    roadLayerRef.current?.setCssTransform(t, lastDrawn);
  }, []);

  const handleTransformEnd = useCallback((t: { x: number; y: number; k: number }) => {
    baseMapLayerRef.current?.draw(t);
    roadLayerRef.current?.draw(t);
  }, []);

  const { svgRef, gRef, transform: zoomTransform, zoomTo } = useMapZoom({
    width,
    height,
    onZoom: handleZoom,
    onZoomStart: handleZoomStart,
    onMomentumStart: () => { },
    onCrossfadeStart: handleCrossfadeStart,
    onTransformTick: handleTransformTick,
    onTransformEnd: handleTransformEnd,
  });

  // ── Geometry & Derived Map Data ─────────────────────────────────────────────
  const { projection, pathGenerator, features, featureAreas, filteredCityFeatures } = useMapGeometry({
    fullMapData,
    level1Data,
    mapData,
    cityData,
    width,
    height,
  });

  const { getFillColor, getStrokeColor } = useMapStyles({
    lastFeedback,
    answeredRegions,
    isBasicMode,
  });

  const isSingleRegion = filteredCityFeatures.length === 1;
  const stageConfig = useMemo(() => getStageStrategy(currentStage).config, [currentStage]);
  const forceShowTowns = stageConfig.mapOptions?.forceShowTownGeometry ?? false;

  // [NEW UX: Flat Level 2 Render] 
  // REGION_SELECT 일 때는 모든 시/군/구 (Level 2, cityData) 77개를 모두 평등하게 랜더링.
  // 선택하면 바로 PLAYING으로 넘어가므로 SUBREGION_SELECT 등 중간 뎁스 삭제.
  const showTownGeometry = gameState === 'PLAYING' && (forceShowTowns || isSingleRegion || zoomTransform.k >= 1.5);

  const featuresToRender = gameState === 'REGION_SELECT'
    ? (cityData?.features || [])
    : (showTownGeometry ? features : filteredCityFeatures);

  const labelsToRender = gameState === 'REGION_SELECT' ? (cityData?.features || []) : filteredCityFeatures;
  const showDistrictLabels = gameState === 'PLAYING' && showTownGeometry;

  // ── Auto-Zoom Controller ────────────────────────────────────────────────────
  useMapAutoZoom({
    gameState,
    selectedChapter,
    width,
    height,
    zoomTo,
    mapData,
    pathGenerator,
  });

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
      const feature = featuresToRender.find((f: any) => f.properties.code === code);
      if (!feature) return;

      const groupCode = code;
      const prefix = groupCode.substring(0, 5); // Level 2 Code (e.g., 41113 수원시 권선구)

      // Select all Level 3 regions (Eup/Myeon/Dong) belonging to this Level 2 code
      // We specifically want `_isEmdGroup` (Terminal Level 3 logic)
      const targetDongs = fullMapData?.features.filter((f: any) =>
        f.properties.code.startsWith(prefix) &&
        (f.properties as any)._isEmdGroup === true
      ) || [];

      // Start game immediately with Flat L2 -> L3 mapping
      startGame({
        chapterCode: groupCode,
        overrideRegions: targetDongs,
        highlightRegions: [], // [Anti Topo-Gap Culling] Do not pass Level 2 polygon to highlight
        isBasicMode: false
      });
      return;
    }

    if (gameState !== 'PLAYING') return;

    if (!forceShowTowns && !showTownGeometry) {
      log.game('[Map] Cannot answer: zoom in to see towns.');
      return;
    }
    checkAnswer({ type: 'MAP_CLICK', regionCode: code });
  }, [gameState, forceShowTowns, showTownGeometry, checkAnswer, filteredCityFeatures]);

  // ── Early Returns ───────────────────────────────────────────────────────────
  if (loading) return <div className="flex justify-center items-center h-full text-gray-400 font-mono">Loading map...</div>;
  if (error) return <div className="text-red-500 flex justify-center items-center h-full font-mono">Error: {error.message}</div>;
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
          isHintActive={isHintActive}
          currentQuestionTargetCode={currentQuestion?.type === 'LOCATE_SINGLE' ? currentQuestion.target.code : undefined}
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
        className="absolute inset-0"
        style={{ zIndex: 20 }}
      >
        {/* InteractionLayer: gRef 내부 (SVG transform 적용됨) */}
        <g ref={gRef} style={{ willChange: 'transform' }} transform={`translate(${zoomTransform.x},${zoomTransform.y}) scale(${zoomTransform.k})`}>
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

          {/* Hierarchical Boundaries (EMD) Overlay: Rendered underneath hovers but above base map */}
          {highlightRegions && highlightRegions.length > 0 && (
            <g style={{ pointerEvents: 'none' }}>
              {highlightRegions.map((region: any) => (
                <path
                  key={`highlight-${region.properties.code}`}
                  d={pathGenerator(region) || ''}
                  fill="none"
                  stroke={theme === 'tactical' ? '#444' : '#94a3b8'}
                  strokeWidth={2.8 / zoomTransform.k}
                  strokeOpacity={0.9}
                />
              ))}
            </g>
          )}

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
            {lastFeedback && (
              <path
                d={pathGenerator(featuresToRender.find((f: any) => f.properties.code === lastFeedback.regionCode) as any) || ''}
                fill="none"
                stroke={lastFeedback.isCorrect ? '#4ade80' : '#f87171'}
                strokeWidth={3 / zoomTransform.k}
                className="animate-pulse"
                style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.5))' }}
              />
            )}
          </g>
          {/* 라벨: gRef 내부. CSS scale(k)로 위치 보정, font-size=14/k로 크기 상쇄.
              setTransform이 매 zoom 프레임 호출되므로 k값이 항상 최신 → 스냅 없음. */}
          {(gameState === 'PLAYING' || gameState === 'REGION_SELECT') && layerVisibility.labels && (
            <>
              {!showDistrictLabels && labelsToRender.map((feature: any) => (
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

              {/* Watermark Labels (EMD level labels) */}
              {highlightRegions && highlightRegions.length > 0 && highlightRegions.map((feature: any) => (
                <RegionLabel
                  key={`label-watermark-${feature.properties.code}`}
                  feature={feature}
                  projection={projection}
                  transform={zoomTransform}
                  answeredRegions={answeredRegions}
                  lastFeedback={lastFeedback}
                  gameState={gameState}
                  fontScale={1.5}  // 거대한 워터마크 크기 (기존 2.5에서 축소)
                  baseArea={featureAreas[feature.properties.code] || 0}
                  isWatermark={true}
                />
              ))}

              {/* District (Ri-level) Labels */}
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
          hoveredRegion={(() => {
            const f = featuresToRender.find((feature: any) => feature.properties.code === hoveredRegion);
            return f ? f.properties.name : undefined;
          })()}
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
