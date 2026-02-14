import { useEffect, useRef, useState, useMemo } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { zoom, zoomIdentity } from 'd3-zoom';
import type { ZoomBehavior, D3ZoomEvent } from 'd3-zoom';
import { select } from 'd3-selection';
import 'd3-transition';
import { useMapScale } from '../../hooks/useMapScale';
import { useGame } from '../../contexts/GameContext';
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
    answeredRegions
  } = useGame();

  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });

  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

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

  // Level 2 데이터 필터링: filteredMapData(Level 3)에 포함된 지역의 상위 code를 가진 Level 2 feature만 추출
  const filteredLevel2Features = useMemo(() => {
    if (!level2Data || features.length === 0) return [];

    const activePrefixes = new Set(features.map(f => f.properties.code.substring(0, 5)));
    return level2Data.features.filter((f: any) =>
      activePrefixes.has(f.properties.code)
    );
  }, [level2Data, features]);

  // LOD 결정 로직
  // 1. 줌 레벨이 1.5 미만이면 Level 2 (시군구)
  // 2. 줌 레벨이 1.5 이상이면 Level 3 (읍면동)
  // 3. 단, 단일 시군구가 선택된 경우(filteredLevel2Features.length === 1)에는 처음부터 Level 3를 보여줌
  const isSingleRegion = filteredLevel2Features.length === 1;
  const isLevel3Rendered = isSingleRegion || transform.k >= 1.5;
  const featuresToRender = isLevel3Rendered ? features : filteredLevel2Features;

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

    // mapData가 변경되면(Auto Fit 적용 시) 줌 상태를 초기화해야 함
    svg.call(zoomBehavior.transform, zoomIdentity);
    setTransform({ x: 0, y: 0, k: 1 });
    handleMove({ zoom: 1 });

  }, [handleMove, mapData]);

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
                    // Level 3가 렌더링된 상태라면 줌 레벨 상관없이 클릭 허용
                    if (!isLevel3Rendered) {
                      log.game('[Map] Cannot answer at Zoom Level 2. Zoom in to Level 3.');
                      return;
                    }
                    checkAnswer({ type: 'MAP_CLICK', regionCode: code });
                  }
                }}
                style={{
                  transition: 'fill 0.2s, stroke 0.2s, stroke-width 0.2s',
                  cursor: gameState === 'PLAYING'
                    ? (isLevel3Rendered ? 'pointer' : 'not-allowed')
                    : 'default'
                }}
              />
            );
          })}

          {gameState === 'PLAYING' && featuresToRender.map((feature: any) => (
            <RegionLabel
              key={`label-${feature.properties.code}`}
              feature={feature}
              projection={projection}
              transform={transform}
              answeredRegions={answeredRegions}
              lastFeedback={lastFeedback}
              gameState={gameState}
            />
          ))}
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
        <div>Target: {mapData.features[0]?.properties.SIG_KOR_NM || 'N/A'}</div>
        <div>Hover: {hoveredRegion || '-'}</div>
      </div>

      {!isLevel3Rendered && gameState === 'PLAYING' && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm pointer-events-none">
          지도를 확대하여 읍/면/동을 찾아보세요!
        </div>
      )}
    </div>
  );
};
