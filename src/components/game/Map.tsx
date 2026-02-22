import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import 'd3-transition';
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

// Theme Color Definitions
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
    mapDataLevel2: level2Data,
    roadData,
    loading,
    error,
    gameState,
    checkAnswer,
    lastFeedback,
    answeredRegions,
    currentLevel,
    startGame,
    selectedChapter
  } = useGame();

  const { theme, showDebugInfo, viewOptions } = useSettings();
  const colors = THEME_COLORS[theme];
  const { transform, setTransform, hoveredRegion, setHoveredRegion, layerVisibility } = useMapContext();
  const { scaleWidth, scaleDistance, scaleUnit, handleMove } = useMapScale();

  // ── Dimensions ──────────────────────────────────────────────────────────────
  const { ref: containerRef, width, height } = useMapDimensions<HTMLDivElement>();

  // ── Refs ────────────────────────────────────────────────────────────────────
  const roadLayerRef = useRef<RoadLayerHandle | null>(null);

  // ── Zoom ────────────────────────────────────────────────────────────────────
  const { svgRef, gRef, baseMapGRef, transform: zoomTransform, zoomTo } = useMapZoom({
    width,
    height,
    onZoom: (t) => {
      setTransform(t);
      handleMove({ zoom: t.k });
    },
    roadLayerRef
  });

  // ── Projection & Path Generator ─────────────────────────────────────────────
  const projection = useMemo(() => {
    const proj = geoMercator();
    if (fullMapData && fullMapData.features && fullMapData.features.length > 0) {
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
    if (features) features.forEach((f: any) => f.properties?.code && (areas[f.properties.code] = pathGenerator.area(f)));
    if (level2Data?.features) level2Data.features.forEach((f: any) => f.properties?.code && (areas[f.properties.code] = pathGenerator.area(f)));
    return areas;
  }, [features, level2Data, pathGenerator]);

  const filteredLevel2Features = useMemo(() => {
    if (!level2Data || features.length === 0) return [];
    const activePrefixes = new Set(features.map(f => f.properties.code.substring(0, 5)));
    return level2Data.features.filter((f: any) => activePrefixes.has(f.properties.code));
  }, [level2Data, features]);

  const isSingleRegion = filteredLevel2Features.length === 1;
  const isLevel1 = currentLevel === 1;
  const isGeometryLevel3 = isLevel1 || isSingleRegion || zoomTransform.k >= 1.5;
  const featuresToRender = isGeometryLevel3 ? features : filteredLevel2Features;
  const showDistrictLabels = isSingleRegion || zoomTransform.k >= 1.5;

  // ── Auto-Zoom Effect ────────────────────────────────────────────────────────
  // Track previous game state to detect transitions
  const prevGameStateRef = useRef<string | null>(null);
  // Watch first feature code to detect when filtered data changes
  const featuresToWatch = mapData?.features?.[0]?.properties?.code;

  useEffect(() => {
    if (!width || !height) return;

    const prevState = prevGameStateRef.current;
    const stateChanged = prevState !== gameState;
    prevGameStateRef.current = gameState;

    // 1. Reset zoom when entering menu/selection screens
    if (gameState === 'LEVEL_SELECT' || gameState === 'GAME_MODE_SELECT' || gameState === 'INITIAL') {
      if (stateChanged) {
        zoomTo({ x: 0, y: 0, k: 1 });
      }
    }
    // 2. Zoom into selected region when game starts (only once on state transition)
    else if (gameState === 'PLAYING') {
      if (stateChanged && mapData && mapData.features.length > 0 && selectedChapter) {
        // Compute bounding box over ALL filtered features
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const feature of mapData.features) {
          const [[fx0, fy0], [fx1, fy1]] = pathGenerator.bounds(feature);
          if (fx0 < x0) x0 = fx0;
          if (fy0 < y0) y0 = fy0;
          if (fx1 > x1) x1 = fx1;
          if (fy1 > y1) y1 = fy1;
        }

        const padding = 60;
        const boundsWidth = x1 - x0;
        const boundsHeight = y1 - y0;

        if (boundsWidth === 0 || boundsHeight === 0) return;

        const scale = Math.min(
          (width - padding * 2) / boundsWidth,
          (height - padding * 2) / boundsHeight,
          8
        );

        const cx = (x0 + x1) / 2;
        const cy = (y0 + y1) / 2;
        const tx = width / 2 - scale * cx;
        const ty = height / 2 - scale * cy;

        zoomTo({ x: tx, y: ty, k: scale });
      }
    }
  }, [gameState, featuresToWatch, width, height, pathGenerator, zoomTo, selectedChapter]);

  // ── Intel Popup ─────────────────────────────────────────────────────────────
  const [intelPopup, setIntelPopup] = useState<{ x: number, y: number, data: any } | null>(null);

  const handleRegionContextMenu = useCallback((event: React.MouseEvent, region: any) => {
    event.preventDefault();
    const neighbors = getAdjacentRegions(region, featuresToRender);
    let roadsInRegion: string[] = [];
    if (roadLayerRef.current) {
      roadsInRegion = roadLayerRef.current.findRoads(region);
    } else {
      const roadFeatures = roadData?.features || [];
      roadsInRegion = getPassingRoads(region, roadFeatures);
    }
    setIntelPopup({
      x: event.clientX,
      y: event.clientY,
      data: { regionName: region.properties.name, neighbors, roads: roadsInRegion }
    });
  }, [featuresToRender, roadData]);

  const closeIntelPopup = useCallback(() => setIntelPopup(null), []);

  // ── Early Returns ───────────────────────────────────────────────────────────
  if (loading) return <div className="flex justify-center items-center h-full text-gray-400 font-mono">Loading map...</div>;
  if (error) return <div className="text-red-500 flex justify-center items-center h-full font-mono">Error: {error.message}</div>;
  if (!mapData || !level2Data) return <div className="flex justify-center items-center h-full text-gray-400 font-mono">No map data</div>;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className={`w-full h-full relative overflow-hidden ${layerVisibility.grid ? 'map-grid' : 'bg-background'}`} onClick={closeIntelPopup}>
      {/* === Layer 1: Base Map (Bottom SVG) === */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="absolute top-0 left-0 w-full h-full"
        style={{ zIndex: 0 }}
      >
        <g ref={baseMapGRef} transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          <BaseMapLayer
            features={featuresToRender}
            level2Data={level2Data}
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

      {/* === Layer 2: Roads (Middle Canvas) === */}
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

      {/* === Layer 3: Interaction & Overlays (Top SVG) === */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="absolute top-0 left-0 w-full h-full"
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
            isGeometryLevel3={isGeometryLevel3}
            onRegionHover={setHoveredRegion}
            answeredRegions={answeredRegions}
            onRegionContextMenu={handleRegionContextMenu}
            onRegionClick={(code) => {
              if (gameState === 'LEVEL_SELECT') {
                log.game(`[Map] Selected Region: ${code}`);
                const cityCode = code.substring(0, 5);
                startGame(cityCode);
                return;
              }

              if (gameState !== 'PLAYING') return;

              const isLevel1 = currentLevel === 1;
              if (!isLevel1 && !isGeometryLevel3) {
                log.game('[Map] Cannot answer at Zoom Level 2. Zoom in to Level 3.');
                return;
              }
              checkAnswer({ type: 'MAP_CLICK', regionCode: code });
            }}
          />

          {gameState === 'PLAYING' && layerVisibility.labels && (
            <>
              {!showDistrictLabels && filteredLevel2Features.map((feature: any) => (
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

      {!isGeometryLevel3 && gameState === 'PLAYING' && currentLevel !== 1 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 glass-panel text-white px-4 py-2 rounded-full text-xs font-mono">
          [확대하여 지역 탐색]
        </div>
      )}
    </div>
  );
};
