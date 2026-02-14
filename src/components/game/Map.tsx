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

  // MapContext에서 transform, hoveredRegion 가져오기
  const { transform, setTransform, hoveredRegion, setHoveredRegion } = useMapContext();

  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const previousGameState = useRef<string>(gameState);

  // 줌 레벨에 따른 스케일 계산 (LOD 관리용)
  const { scaleWidth, scaleDistance, scaleUnit, handleMove } = useMapScale();

  const width = 800;
  const height = 600;

  // 선택된 데이터에 맞춰 지도 자동 조정 (Auto Fit)
  const projection = useMemo(() => {
    const proj = geoMercator();

    if (mapData && mapData.features && mapData.features.length > 0) {
      // fitExtent를 사용하여 데이터가 화면에 꽉 차도록(padding 50px) 설정
      proj.fitExtent([[50, 50], [width - 50, height - 50]], mapData as any);
    } else {
      // 데이터가 없을 때 fallback: 경기도 중심
      proj.center([127.17, 37.45])
        .scale(60000)
        .translate([width / 2, height / 2]);
    }
    return proj;
  }, [mapData]);

  const pathGenerator = geoPath().projection(projection);

  // Features 계산 (LOD 및 필터링)
  const features = mapData?.features || [];

  // Performance Optimization: Pre-calculate areas for all features
  // 지도가 로드될 때 한 번만 계산하여 렌더링 시 부하 제거 (O(N))
  // Hook 위치 수정: 조건부 리턴보다 상위에 있어야 함
  const featureAreas = useMemo(() => {
    const areas: Record<string, number> = {};

    // Level 3 Features (District)
    if (features) {
      features.forEach((f: any) => {
        if (f.properties?.code) {
          areas[f.properties.code] = pathGenerator.area(f);
        }
      });
    }

    // Level 2 Features (City)
    if (level2Data?.features) {
      level2Data.features.forEach((f: any) => {
        if (f.properties?.code) {
          areas[f.properties.code] = pathGenerator.area(f);
        }
      });
    }

    return areas;
  }, [features, level2Data, pathGenerator]);

  // Level 2 데이터 필터링: filteredMapData(Level 3)에 포함된 지역의 상위 code를 가진 Level 2 feature만 추출
  const filteredLevel2Features = useMemo(() => {
    if (!level2Data || features.length === 0) return [];

    const activePrefixes = new Set(features.map(f => f.properties.code.substring(0, 5)));
    return level2Data.features.filter((f: any) =>
      activePrefixes.has(f.properties.code)
    );
  }, [level2Data, features]);

  // LOD 결정 로직
  // 1. Geometry (Polygons): Level 1에서는 항상 Level 3 경계선을 보여줌 (클릭 가능해야 함)
  const isSingleRegion = filteredLevel2Features.length === 1;
  const isLevel1 = currentLevel === 1;
  const isGeometryLevel3 = isLevel1 || isSingleRegion || transform.k >= 1.5;
  const featuresToRender = isGeometryLevel3 ? features : filteredLevel2Features;

  // 2. Labels (Text): Level 1이라도 줌이 멀면 시/군 라벨(Macro)을 보여줌 (Visual Hierarchy)
  // 단일 지역 선택 시에는 이미 줌이 당겨져 있을 것이므로 자연스럽게 Micro View가 됨
  const showDistrictLabels = isSingleRegion || transform.k >= 1.5;

  // D3 Zoom 설정
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
      });

    svg.call(zoomBehavior);

    previousGameState.current = gameState;

  }, [handleMove, mapData, gameState]);

  // 2. Conditional Returns (UI States)
  if (loading) return <div className="flex justify-center items-center h-full">Loading map...</div>;
  if (error) return <div className="text-red-500 flex justify-center items-center h-full">Error loading map: {error.message}</div>;
  if (!mapData || !level2Data) return <div className="flex justify-center items-center h-full">No map data available</div>;

  return (
    <div className="w-full h-full bg-blue-50 relative overflow-hidden">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
      >
        <g ref={gRef}>
          {featuresToRender.map((feature: any, index: number) => {
            const code = feature.properties.code;
            const isAnswered = answeredRegions.has(code);

            const isCorrectFeedback = lastFeedback?.regionCode === code && lastFeedback?.isCorrect;
            const isWrongFeedback = lastFeedback?.regionCode === code && !lastFeedback?.isCorrect;

            let fillColor = '#fff';
            if (isAnswered) fillColor = '#4ade80';
            if (isCorrectFeedback) fillColor = '#4ade80';
            if (isWrongFeedback) fillColor = '#f87171';

            if (hoveredRegion === code && gameState === 'PLAYING') {
              fillColor = isAnswered ? '#22c55e' : '#e0e7ff';
            }

            return (
              <path
                key={code || index}
                d={pathGenerator(feature as any) || ''}
                fill={fillColor}
                stroke="#3b82f6"
                strokeWidth={0.5 / transform.k}
                onMouseEnter={() => setHoveredRegion(code)}
                onMouseLeave={() => setHoveredRegion(null)}
                onClick={() => {
                  if (gameState === 'PLAYING' && code) {
                    // Level 1(시군구 찾기)은 줌 레벨 상관없이 클릭 허용
                    // Level 2+(읍면동 찾기)는 Level 3가 렌더링된 상태여야 함
                    const isLevel1 = currentLevel === 1;

                    if (!isLevel1 && !isGeometryLevel3) {
                      log.game('[Map] Cannot answer at Zoom Level 2. Zoom in to Level 3.');
                      return;
                    }
                    checkAnswer({ type: 'MAP_CLICK', regionCode: code });
                  }
                }}
                style={{
                  transition: 'fill 0.2s, stroke 0.2s, stroke-width 0.2s',
                  cursor: gameState === 'PLAYING'
                    ? (isGeometryLevel3 ? 'pointer' : 'not-allowed')
                    : 'default'
                }}
              />
            );
          })}

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

      <div className="absolute top-4 left-4 bg-black/70 text-white p-4 rounded-lg text-xs pointer-events-none font-mono z-50">
        <div className="font-bold mb-2 text-yellow-400">DEV INFO</div>
        <div>Zoom: {transform.k.toFixed(2)}</div>
        <div>X: {transform.x.toFixed(0)}, Y: {transform.y.toFixed(0)}</div>
        <div>Rendered: {featuresToRender.length}</div>
        <div>Target: {mapData?.features?.[0]?.properties.SIG_KOR_NM || 'N/A'}</div>
        <div>Hover: {hoveredRegion || '-'}</div>
      </div>

      {!isGeometryLevel3 && gameState === 'PLAYING' && currentLevel !== 1 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm pointer-events-none">
          지도를 확대하여 읍/면/동을 찾아보세요!
        </div>
      )}
    </div>
  );
};
