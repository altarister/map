import { useEffect, useRef, useMemo } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { zoom, zoomIdentity } from 'd3-zoom';
import type { D3ZoomEvent } from 'd3-zoom';
import { select } from 'd3-selection';
import 'd3-transition';
import { useMapScale } from '../../hooks/useMapScale';
import { useGame } from '../../contexts/GameContext';
import { useMapContext } from '../../contexts/MapContext';
import { MapScale } from './MapScale';
import { RegionLabel } from './RegionLabel';
import { log } from '../../lib/debug';

import { useSettings } from '../../contexts/SettingsContext';

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
    stroke: '#cbd5e1', // Slate-300
    answeredFill: 'rgba(59, 130, 246, 0.4)', // Blue-500 tint
    answeredStroke: '#cbd5e1', // Same as default stroke
    correctFill: 'rgba(59, 130, 246, 0.6)',
    correctStroke: '#cbd5e1', // Same as default stroke
    wrongFill: 'rgba(239, 68, 68, 0.6)', // Red-500 tint
    wrongStroke: '#cbd5e1', // Same as default stroke
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

  // ... (keeping existing refs and scale hooks)
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const previousGameState = useRef<string>(gameState);
  const { scaleWidth, scaleDistance, scaleUnit, handleMove } = useMapScale();
  const width = 800;
  const height = 600;

  // ... (keeping existing projection and pathGenerator logic)
  const projection = useMemo(() => {
    const proj = geoMercator();
    if (mapData && mapData.features && mapData.features.length > 0) {
      proj.fitExtent([[50, 50], [width - 50, height - 50]], mapData as any);
    } else {
      proj.center([127.17, 37.45]).scale(60000).translate([width / 2, height / 2]);
    }
    return proj;
  }, [mapData]);

  const pathGenerator = geoPath().projection(projection);
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
      .on("dblclick.zoom", null); // <--- Key Fix: Disable auto-zoom on dblclick

    previousGameState.current = gameState;
  }, [handleMove, mapData, gameState]);

  if (loading) return <div className="flex justify-center items-center h-full text-gray-400 font-mono">Loading map...</div>;
  if (error) return <div className="text-red-500 flex justify-center items-center h-full font-mono">Error: {error.message}</div>;
  if (!mapData || !level2Data) return <div className="flex justify-center items-center h-full text-gray-400 font-mono">No map data</div>;

  return (
    <div className="w-full h-full map-grid relative overflow-hidden">
      <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <g ref={gRef}>
          {/* Context Layer: Silhouette of full Level 2 Map */}
          {level2Data?.features.map((feature: any) => (
            <path
              key={`context-${feature.properties.code}`}
              d={pathGenerator(feature) || ''}
              fill="none"
              stroke={theme === 'tactical' ? '#333333' : '#e2e8f0'}
              strokeWidth={0.5 / transform.k}
              style={{ pointerEvents: 'none' }}
            />
          ))}

          {/* Active Game Layer */}
          {featuresToRender.map((feature: any, index: number) => {
            const code = feature.properties.code;
            const isAnswered = answeredRegions.has(code);
            const isCorrectFeedback = lastFeedback?.regionCode === code && lastFeedback?.isCorrect;
            const isWrongFeedback = lastFeedback?.regionCode === code && !lastFeedback?.isCorrect;

            let fillColor = colors.fill;
            let strokeColor = colors.stroke;
            let strokeWidth = 1 / transform.k;

            if (isAnswered) {
              fillColor = colors.answeredFill;
              strokeColor = colors.answeredStroke;
            }
            if (isCorrectFeedback) {
              fillColor = colors.correctFill;
              strokeColor = colors.correctStroke;
            }
            if (isWrongFeedback) {
              fillColor = colors.wrongFill;
              strokeColor = colors.wrongStroke;
            }

            // Hover logic (fill only, stroke handled by overlay)
            if (hoveredRegion === code && gameState === 'PLAYING') {
              fillColor = isAnswered ? colors.hoverFill : colors.hoverDefaultFill;
            }

            return (
              <path
                key={code || index}
                d={pathGenerator(feature as any) || ''}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                onMouseEnter={() => setHoveredRegion(code)}
                onMouseLeave={() => setHoveredRegion(null)}
                onClick={() => {
                  if (gameState === 'PLAYING' && code) {
                    const isLevel1 = currentLevel === 1;
                    if (!isLevel1 && !isGeometryLevel3) {
                      log.game('[Map] Cannot answer at Zoom Level 2. Zoom in to Level 3.');
                      return;
                    }
                    checkAnswer({ type: 'MAP_CLICK', regionCode: code });
                  }
                }}
                style={{
                  transition: 'fill 0.15s, stroke 0.15s',
                  cursor: gameState === 'PLAYING' ? (isGeometryLevel3 ? 'pointer' : 'not-allowed') : 'default'
                }}
              />
            );
          })}

          {/* Highlight Overlay Layer: Render Hovered Region on Top for Z-Index Fix */}
          {/* Must be rendered BEFORE labels but AFTER the main map layer */}
          {gameState === 'PLAYING' && hoveredRegion && (() => {
            const targetFeature = featuresToRender.find((f: any) => f.properties.code === hoveredRegion);
            if (!targetFeature) return null;

            return (
              <path
                key={`highlight-${hoveredRegion}`}
                d={pathGenerator(targetFeature as any) || ''}
                fill="none"
                stroke={colors.hoverStroke}
                strokeWidth={2 / transform.k}
                style={{ pointerEvents: 'none' }}
              />
            );
          })()}

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
      />



      {!isGeometryLevel3 && gameState === 'PLAYING' && currentLevel !== 1 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 glass-panel text-white px-4 py-2 rounded-full text-xs font-mono">
          [ZOOM IN TO SCAN]
        </div>
      )}
    </div>
  );
};
