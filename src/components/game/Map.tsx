import { useEffect, useRef, useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { zoom, zoomIdentity } from 'd3-zoom';
import type { D3ZoomEvent } from 'd3-zoom';
import { select } from 'd3-selection';
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
    filteredMapData: mapData,
    mapDataLevel2: level2Data,
    loading,
    error,
    gameState,
    checkAnswer,
    lastFeedback,
    answeredRegions,
    currentLevel
  } = useGame();

  const { theme } = useSettings();
  const colors = THEME_COLORS[theme];

  // MapContext에서 transform, hoveredRegion 가져오기
  const { transform, setTransform, hoveredRegion, setHoveredRegion } = useMapContext();
  const { showDebugInfo } = useSettings();

  // ... (keeping existing refs and scale hooks)
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const previousGameState = useRef<string>(gameState);
  const { scaleWidth, scaleDistance, scaleUnit, handleMove } = useMapScale();

  // Responsive Dimensions
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };

    window.addEventListener('resize', updateDimensions);
    updateDimensions(); // Initial calculation

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const width = dimensions.width;
  const height = dimensions.height;

  // ... (keeping existing projection and pathGenerator logic)
  const projection = useMemo(() => {
    const proj = geoMercator();
    if (mapData && mapData.features && mapData.features.length > 0) {
      proj.fitExtent([[50, 50], [width - 50, height - 50]], mapData as any);
    } else {
      proj.center([127.17, 37.45]).scale(60000).translate([width / 2, height / 2]);
    }
    return proj;
  }, [mapData, width, height]);

  const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);
  const features = mapData?.features || [];

  // ... (keeping existing areas calculation)
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
  const isGeometryLevel3 = isLevel1 || isSingleRegion || transform.k >= 1.5;
  const featuresToRender = isGeometryLevel3 ? features : filteredLevel2Features;
  const showDistrictLabels = isSingleRegion || transform.k >= 1.5;

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svg = select(svgRef.current);
    const g = select(gRef.current);
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        const { x, y, k } = event.transform;
        g.attr('transform', `translate(${x},${y}) scale(${k})`);
        setTransform({ x, y, k });
        handleMove({ zoom: k });
        handleMove({ zoom: k });
      });

    // Initialize zoom behavior and disable double-click to zoom
    svg.call(zoomBehavior)
      .on("dblclick.zoom", null);

    // Initial scale calculation
    handleMove({ zoom: transform.k });

    previousGameState.current = gameState;
  }, [handleMove, mapData, gameState]);

  if (loading) return <div className="flex justify-center items-center h-full text-gray-400 font-mono">Loading map...</div>;
  if (error) return <div className="text-red-500 flex justify-center items-center h-full font-mono">Error: {error.message}</div>;
  if (!mapData || !level2Data) return <div className="flex justify-center items-center h-full text-gray-400 font-mono">No map data</div>;

  return (
    <div ref={containerRef} className="w-full h-full map-grid relative overflow-hidden">
      <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <g ref={gRef}>
          {/* Layer 1: Base Context & Answered Regions (Heavy, Static) */}
          <BaseMapLayer
            features={featuresToRender}
            level2Data={level2Data}
            pathGenerator={pathGenerator}
            theme={theme}
            themeColors={colors}
            transform={transform}
            answeredRegions={answeredRegions}
            lastFeedback={lastFeedback}
          />

          {/* Layer 2: Highlight Overlay (Light, Dynamic) */}
          {/* Handles Hover state and Wrong Feedback flash */}
          <HighlightOverlay
            features={featuresToRender}
            pathGenerator={pathGenerator}
            hoveredRegion={gameState === 'PLAYING' ? hoveredRegion : null}
            themeColors={colors}
            transform={transform}
            lastFeedback={lastFeedback}
          />

          {/* Layer 3: Interaction Layer (Invisible, Event Handling) */}
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

          {/* Label Rendering: Dual Layer System (Visual Hierarchy) */}
          {gameState === 'PLAYING' && (
            <>
              {/* Layer 1: Macro View (City Labels) - Show when zoomed out */}
              {!showDistrictLabels && filteredLevel2Features.map((feature: any) => (
                <RegionLabel
                  key={`label-city-${feature.properties.code}`}
                  feature={feature}
                  projection={projection}
                  transform={transform}
                  answeredRegions={answeredRegions}
                  lastFeedback={lastFeedback}
                  gameState={gameState}
                  fontScale={1.5} // Larger font for City names
                  baseArea={featureAreas[feature.properties.code] || 0}
                />
              ))}

              {/* Layer 2: Micro View (District Labels) - Show when zoomed in */}
              {showDistrictLabels && featuresToRender.map((feature: any) => (
                <RegionLabel
                  key={`label-district-${feature.properties.code}`}
                  feature={feature}
                  projection={projection}
                  transform={transform}
                  answeredRegions={answeredRegions}
                  lastFeedback={lastFeedback}
                  gameState={gameState}
                  fontScale={1.0} // Standard font for District names
                  baseArea={featureAreas[feature.properties.code] || 0}
                />
              ))}
            </>
          )}
        </g>
      </svg>

      <MapScale
        width={scaleWidth}
        distance={scaleDistance}
        unit={scaleUnit}
        zoom={transform.k}
        hoveredRegion={featuresToRender.find((f: any) => f.properties.code === hoveredRegion)?.properties.name}
        renderedCount={featuresToRender.length}
        showDebug={showDebugInfo}
      />

      {!isGeometryLevel3 && gameState === 'PLAYING' && currentLevel !== 1 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 glass-panel text-white px-4 py-2 rounded-full text-xs font-mono">
          [ZOOM IN TO SCAN]
        </div>
      )}
    </div>
  );
};
