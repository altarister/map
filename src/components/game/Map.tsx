import { useRef, useMemo, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { getStageStrategy } from '../../game/stages/registry';
import { useMapScale } from '../../hooks/useMapScale';
import { useGame } from '../../contexts/GameContext';
import { useMapContext } from '../../contexts/MapContext';
import { useSettings } from '../../contexts/SettingsContext';
import { MapScale } from './MapScale';
import { RegionLabel } from './RegionLabel';
import { BaseMapLayer } from './BaseMapLayer';
import { HighlightOverlay } from './HighlightOverlay';
import { InteractionLayer } from './InteractionLayer';
import { RoadLayer } from './RoadLayer';
import type { RoadLayerHandle } from './RoadLayer';
import { useMapDimensions } from '../../hooks/useMapDimensions';
import { useMapZoom } from '../../hooks/useMapZoom';
import { log } from '../../lib/debug';
import { IntelPopup } from './IntelPopup';
import { getAdjacentRegions, getPassingRoads } from '../../game/systems/IntelSystem';

// ── Theme Color Definitions ──────────────────────────────────────────────────
const THEME_COLORS = {
  tactical: {
    fill: '#1a1a1a',
    stroke: '#444444',
    answeredFill: 'rgba(22, 163, 74, 0.4)',
    answeredStroke: '#444444',
    correctFill: 'rgba(22, 163, 74, 0.6)',
    correctStroke: '#444444',
    wrongFill: 'rgba(220, 38, 38, 0.6)',
    wrongStroke: '#444444',
    hoverFill: 'rgba(255, 255, 255, 0.1)',
    hoverStroke: '#ffffff',
    hoverDefaultFill: '#333333',
  },
  kids: {
    fill: '#ffffff',
    stroke: '#94a3b8',
    answeredFill: 'rgba(59, 130, 246, 0.4)',
    answeredStroke: '#94a3b8',
    correctFill: 'rgba(59, 130, 246, 0.6)',
    correctStroke: '#94a3b8',
    wrongFill: 'rgba(239, 68, 68, 0.6)',
    wrongStroke: '#94a3b8',
    hoverFill: 'rgba(250, 204, 21, 0.4)',
    hoverStroke: '#f59e0b',
    hoverDefaultFill: '#fef3c7',
  }
};

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

  const { theme, showDebugInfo, viewOptions, difficulty } = useSettings();
  const colors = THEME_COLORS[theme];
  const { transform, setTransform, hoveredRegion, setHoveredRegion, layerVisibility } = useMapContext();
  const { scaleWidth, scaleDistance, scaleUnit, handleMove } = useMapScale();

  // ── Dimensions ──────────────────────────────────────────────────────────────
  const { ref: containerRef, width, height } = useMapDimensions<HTMLDivElement>();

  // ── Refs ────────────────────────────────────────────────────────────────────
  const roadLayerRef = useRef<RoadLayerHandle | null>(null);

  // ── Zoom ────────────────────────────────────────────────────────────────────
  const handleZoom = useCallback((t: { x: number; y: number; k: number }) => {
    setTransform(t);
    handleMove({ zoom: t.k });
  }, [setTransform, handleMove]);

  const { svgRef, gRef, baseMapGRef, transform: zoomTransform, zoomTo } = useMapZoom({
    width,
    height,
    onZoom: handleZoom,
    roadLayerRef,
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
  
  const showTownGeometry = forceShowTowns || isSingleRegion || zoomTransform.k >= 1.5;
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
      {/* Layer 1: Base Map */}
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="absolute inset-0" style={{ zIndex: 0 }}>
        <g ref={baseMapGRef} transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          <BaseMapLayer
            features={featuresToRender}
            cityData={cityData}
            pathGenerator={pathGenerator}
            theme={theme}
            themeColors={colors}
            transform={transform}
            answeredRegions={answeredRegions}
            lastFeedback={lastFeedback}
            showBoundaries={layerVisibility.boundaries}
          />
        </g>
      </svg>

      {/* Layer 2: Roads */}
      {roadData && (
        <RoadLayer
          ref={roadLayerRef}
          features={roadData.features}
          projection={projection}
          transform={transform}
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

      {/* Layer 3: Interaction & Overlays */}
      <svg
        ref={svgRef}
        width="100%" height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0"
        style={{ zIndex: 20 }}
      >
        <g ref={gRef}>
          <HighlightOverlay
            features={featuresToRender}
            pathGenerator={pathGenerator}
            hoveredRegion={gameState === 'PLAYING' ? hoveredRegion : null}
            themeColors={colors}
            transform={transform}
            lastFeedback={lastFeedback}
          />
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

          {gameState === 'PLAYING' && layerVisibility.labels && difficulty === 'NORMAL' && (
            <>
              {!showDistrictLabels && filteredCityFeatures.map((feature: any) => (
                <RegionLabel
                  key={`label-city-${feature.properties.code}`}
                  feature={feature}
                  projection={projection}
                  transform={transform}
                  answeredRegions={answeredRegions}
                  lastFeedback={lastFeedback}
                  gameState={gameState}
                  fontScale={1.5}
                  baseArea={featureAreas[feature.properties.code] || 0}
                />
              ))}
              {showDistrictLabels && featuresToRender.map((feature: any) => (
                <RegionLabel
                  key={`label-district-${feature.properties.code}`}
                  feature={feature}
                  projection={projection}
                  transform={transform}
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
          zoom={transform.k}
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
