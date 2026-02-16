import { useRef, useMemo } from 'react';
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

// Theme Color Definitions
const THEME_COLORS = {
  tactical: {
    fill: '#1a1a1a',
    stroke: '#444444',
    answeredFill: 'rgba(22, 163, 74, 0.4)', // Slightly more opaque for visibility without border
    answeredStroke: '#444444', // Same as default stroke
    correctFill: 'rgba(22, 163, 74, 0.6)', // Bright green fill
    correctStroke: '#444444', // Same as default stroke
    wrongFill: 'rgba(220, 38, 38, 0.6)', // Bright red fill
    wrongStroke: '#444444', // Same as default stroke
    hoverFill: 'rgba(255, 255, 255, 0.1)', // Subtle light fill
    hoverStroke: '#ffffff', // Hover still needs highlight (handled by overlay)
    hoverDefaultFill: '#333333',
  },
  kids: {
    fill: '#ffffff',
    stroke: '#94a3b8', // Slate-400 (Darker for better visibility)
    answeredFill: 'rgba(59, 130, 246, 0.4)', // Blue-500 tint
    answeredStroke: '#94a3b8', // Match default stroke
    correctFill: 'rgba(59, 130, 246, 0.6)',
    correctStroke: '#94a3b8', // Match default stroke
    wrongFill: 'rgba(239, 68, 68, 0.6)', // Red-500 tint
    wrongStroke: '#94a3b8', // Match default stroke
    hoverFill: 'rgba(250, 204, 21, 0.4)', // Yellow-400 tint
    hoverStroke: '#f59e0b', // Amber-500 (Hover still highlighted)
    hoverDefaultFill: '#fef3c7', // Amber-100
  }
};

export const Map = () => {
  // 1. Hooks (Must be called unconditionally)
  const {
    mapData: fullMapData, // Use full data for projection
    filteredMapData: mapData, // Use filtered data for gameplay
    mapDataLevel2: level2Data,
    roadData, // Consume preloaded road data
    loading,
    error,
    gameState,
    checkAnswer,
    lastFeedback,
    answeredRegions,
    currentLevel
  } = useGame();

  const { theme, showDebugInfo, viewOptions } = useSettings();
  const colors = THEME_COLORS[theme];

  // MapContext에서 transform, hoveredRegion 가져오기
  const { transform, setTransform, hoveredRegion, setHoveredRegion, layerVisibility } = useMapContext();
  const { scaleWidth, scaleDistance, scaleUnit, handleMove } = useMapScale();

  // 2. Responsive Dimensions
  const { ref: containerRef, width, height } = useMapDimensions<HTMLDivElement>();

  // Road Layer Ref for Imperative Updates (Sync)
  const roadLayerRef = useRef<RoadLayerHandle | null>(null);

  // 3. Zoom & Pan Logic (Abstracted)
  // Sync D3 zoom state with MapContext immediately
  const { svgRef, gRef, baseMapGRef, transform: zoomTransform } = useMapZoom({
    width,
    height,
    onZoom: (t) => {
      setTransform(t);
      handleMove({ zoom: t.k });
    },
    roadLayerRef // Pass ref to hook
  });

  // --- Derived State (Restored) ---
  const projection = useMemo(() => {
    const proj = geoMercator();
    // Always fit to FULL map data (Gyeonggi-do), not the filtered (selected) data
    if (fullMapData && fullMapData.features && fullMapData.features.length > 0) {
      proj.fitExtent([[50, 50], [width - 50, height - 50]], fullMapData as any);
    } else {
      proj.center([127.17, 37.45]).scale(60000).translate([width / 2, height / 2]);
    }
    return proj;
  }, [fullMapData, width, height]);

  const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);
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
  // --------------------------------

  if (loading) return <div className="flex justify-center items-center h-full text-gray-400 font-mono">Loading map...</div>;
  if (error) return <div className="text-red-500 flex justify-center items-center h-full font-mono">Error: {error.message}</div>;
  if (!mapData || !level2Data) return <div className="flex justify-center items-center h-full text-gray-400 font-mono">No map data</div>;

  return (
    <div ref={containerRef} className={`w-full h-full relative overflow-hidden ${layerVisibility.grid ? 'map-grid' : 'bg-background'}`}>
      {/* === Layer 1: Base Map (Bottom SVG) === */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="absolute top-0 left-0 w-full h-full"
        style={{ zIndex: 0 }}
      >
        {/* Attach Ref for Sync */}
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
      {roadData && layerVisibility.roads && (
        <RoadLayer
          ref={roadLayerRef}
          features={roadData.features}
          projection={projection}
          transform={transform}
          width={width}
          height={height}
          theme={theme}
        />
      )}

      {/* === Layer 3: Interaction & Overlays (Top SVG) === */}
      <svg
        ref={svgRef} // Zoom behavior attaches here
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="absolute top-0 left-0 w-full h-full"
        style={{ zIndex: 20 }}
      >
        <g ref={gRef}> {/* Zoom Transform applied here via D3 */}

          {/* Highlight Overlay */}
          <HighlightOverlay
            features={featuresToRender}
            pathGenerator={pathGenerator}
            hoveredRegion={gameState === 'PLAYING' ? hoveredRegion : null}
            themeColors={colors}
            transform={transform}
            lastFeedback={lastFeedback}
          />

          {/* Interaction Layer (Invisible Targets) */}
          <InteractionLayer
            features={featuresToRender}
            pathGenerator={pathGenerator}
            gameState={gameState}
            isGeometryLevel3={isGeometryLevel3}
            onRegionHover={setHoveredRegion}
            answeredRegions={answeredRegions}
            onRegionClick={(code) => {
              if (gameState !== 'PLAYING') return;

              const isLevel1 = currentLevel === 1;
              if (!isLevel1 && !isGeometryLevel3) {
                log.game('[Map] Cannot answer at Zoom Level 2. Zoom in to Level 3.');
                return;
              }
              checkAnswer({ type: 'MAP_CLICK', regionCode: code });
            }}
          />

          {/* Labels */}
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
          [ZOOM IN TO SCAN]
        </div>
      )}
    </div>
  );
};
