import { useState, useCallback, useEffect, memo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from '@vnedyalk0v/react19-simple-maps';
import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useMapStyles } from '../../hooks/useMapStyles';
import { useMapScale } from '../../hooks/useMapScale';

import { RegionLabel } from './RegionLabel';
import { MapScale } from './MapScale';
import type { RegionFeature } from '../../types/geo';
import { getLevelStrategy } from '../../game/levels/registry';

// 상수: 지도 투영 설정
const PROJECTION_CONFIG = {
  scale: 8000,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  center: [127.25, 37.55] as any, // 경기도 중심
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rotate: [0, 0, 0] as any,
};


// Base Layer Item (Memoized)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface BaseMapItemProps {
  geo: any;
  code: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  gameState: string;
  onEnter: (code: string) => void;
  onLeave: () => void;
  onClick: (code: string) => void;
  feature: RegionFeature;
  answeredRegions: Set<string>;
  lastFeedback: any;
  zoom: number;
  fontSize: number;
}

const BaseMapItem = memo(({ 
  geo, code, fill, stroke, strokeWidth, gameState, 
  onEnter, onLeave, onClick, 
  feature, answeredRegions, lastFeedback, zoom, fontSize 
}: BaseMapItemProps) => {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <g key={(geo as any).rsmKey || code}>
      <Geography
        geography={geo}
        onMouseEnter={() => onEnter(code)}
        onMouseLeave={onLeave}
        onClick={() => onClick(code)}
        style={{
          default: {
            fill,
            stroke,
            strokeWidth,
            outline: 'none',
            transition: 'all 0.1s ease',
            vectorEffect: 'non-scaling-stroke',
          },
          hover: {
            fill, // Base Layer는 Hover 색상 변경 없음 (Overlay가 담당)
            stroke: '#6366f1', 
            strokeWidth: 3 / zoom, 
            outline: 'none',
            cursor: gameState === 'PLAYING' ? 'pointer' : 'default',
            vectorEffect: 'non-scaling-stroke',
          },
          pressed: {
            fill,
            outline: 'none',
            vectorEffect: 'non-scaling-stroke',
          },
        } as any}
      />
      <RegionLabel 
        feature={feature} 
        gameState={gameState as any} 
        answeredRegions={answeredRegions} 
        lastFeedback={lastFeedback}
        zoom={zoom}
        fontScale={fontSize}
      />
    </g>
  );
}, (prev, next) => {
  // Custom Comparison for Performance
  // deep comparison of answeredRegions Set is expensive, so checking size/has might be needed
  // But here answeredRegions is a Referentially Stable Set? No, it's new every update usually?
  // Let's rely on standard shallow comparison assuming props are primitive/stable enough.
  // Actually, answeredRegions is a Set. Shallow compare will fail if it's a new Set instance.
  // We need to check if 'code' is in prev.answered and next.answered.
  
  if (prev.code !== next.code) return false;
  if (prev.zoom !== next.zoom) return false;
  if (prev.fill !== next.fill) return false;
  if (prev.stroke !== next.stroke) return false;
  
  // Check if answered status changed for THIS item
  const wasAnswered = prev.answeredRegions.has(prev.code);
  const isAnswered = next.answeredRegions.has(next.code);
  if (wasAnswered !== isAnswered) return false;

  // Check feedback
  if (prev.lastFeedback !== next.lastFeedback) return false; // Simple ref check

  return true;
});
BaseMapItem.displayName = 'BaseMapItem';

export const Map = () => {
    // ... (rest of the component)

  const { mapData, loading, gameState, checkAnswer, error, lastFeedback, answeredRegions, levelState, currentQuestion } = useGame();
  const { fontSize, currentLevel } = useSettings();
  const { getFillColor, getStrokeColor } = useMapStyles({ lastFeedback, answeredRegions });
  const { scaleWidth, scaleDistance, scaleUnit, handleMove: handleScaleMove } = useMapScale();
  
  // Hover 상태 관리
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(1);

  // 이벤트 핸들러
  const handleRegionClick = useCallback((regionCode: string) => {
    if (gameState !== 'PLAYING') return;
    checkAnswer({ type: 'MAP_CLICK', regionCode });
  }, [gameState, checkAnswer]);

  const handleRegionEnter = useCallback((regionCode: string) => {
    if (gameState === 'PLAYING') {
      setHoveredRegion(regionCode);
    }
  }, [gameState]);

  const handleRegionLeave = useCallback(() => {
    setHoveredRegion(null);
  }, []);
  
  // 줌/이동 핸들러
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMove = useCallback((position: any) => {
    handleScaleMove(position);
    if (position.zoom) {
      setCurrentZoom(position.zoom);
    }
  }, [handleScaleMove]);
  
  // 초기 로드시 한 번 handleMove 호출하여 스케일 초기화
  useEffect(() => {
    handleMove({ zoom: 1 });
  }, [handleMove]);



  if (loading) return <div className="flex justify-center items-center h-full">지도 로딩 중...</div>;
  if (error) return <div className="flex justify-center items-center h-full text-red-500">지도 로딩 실패: {error.message}</div>;
  if (!mapData) return null;

  return (
    <div className="w-full h-full bg-slate-50 rounded-lg overflow-hidden border border-slate-200 shadow-inner">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={PROJECTION_CONFIG}
        className="w-full h-full"
      >
        <ZoomableGroup 
          zoom={1} 
          minZoom={0.5} 
          maxZoom={8}
          onMove={handleMove} // 줌/이동 시 스케일 및 줌 상태 업데이트
        >
          <Geographies geography={mapData}>
            {({ geographies }) => {
              return (
                <>
                  {/* 1. Base Layer: 모든 지역을 고정된 순서로 렌더링 (Re-mount 방지) */}
                  {geographies.map((geo) => {
                    const feature = geo as RegionFeature;
                    const code = feature.properties?.code;
                    if (!code) return null;
                    
                    return (
                      <BaseMapItem
                        key={(geo as any).rsmKey || code}
                        geo={geo}
                        code={code}
                        feature={feature}
                        fill={getFillColor(code, false)}
                        stroke={getStrokeColor(code, false)}
                        strokeWidth={1 / currentZoom}
                        gameState={gameState}
                        onEnter={handleRegionEnter}
                        onLeave={handleRegionLeave}
                        onClick={handleRegionClick}
                        answeredRegions={answeredRegions}
                        lastFeedback={lastFeedback}
                        zoom={currentZoom}
                        fontSize={fontSize}
                      />
                    );
                  })}

                  {/* 2. Feedback/Hover Overlay Layer: 강조해야 할 지역만 맨 위에 덧그리기 (Z-Index 효과) */}
                  {geographies.map((geo) => {
                     const feature = geo as RegionFeature;
                     const code = feature.properties?.code;
                     if (!code) return null;

                     // 강조 대상인지 확인
                     const isHovered = hoveredRegion === code;
                     const isFeedback = lastFeedback && (lastFeedback.regionCode === code || lastFeedback.correctCode === code);
                     
                     if (!isHovered && !isFeedback) return null;

                     return (
                        <Geography
                          key={`overlay-${code}`}
                          geography={geo}
                          style={{
                            default: {
                                fill: 'none', // 배경색은 아래 레이어에 맡김 (혹은 여기서 덮어써도 됨)
                                stroke: isHovered ? '#6366f1' : getStrokeColor(code, false),
                                strokeWidth: isHovered ? 3 / currentZoom : 2 / currentZoom, // 강조 두께
                                outline: 'none',
                                pointerEvents: 'none', // 이벤트는 아래 레이어가 받음
                                vectorEffect: 'non-scaling-stroke',
                            },
                            hover: { fill: 'none', outline: 'none', stroke: '#6366f1', strokeWidth: 3 / currentZoom, vectorEffect: 'non-scaling-stroke' },
                            pressed: { fill: 'none', outline: 'none', vectorEffect: 'non-scaling-stroke' }
                          } as any}
                        />
                     );
                  })}
                </>
              );
            }}
          </Geographies>
          
          {/* 레벨별 오버레이 (예: 경로 그리기) */}
          {mapData && currentQuestion && (
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             getLevelStrategy(currentLevel).renderMapOverlay(currentQuestion, mapData.features as any, levelState)
          )}
        </ZoomableGroup>
      </ComposableMap>
      
      {/* 축척 바 표시 */}
      <MapScale width={scaleWidth} distance={scaleDistance} unit={scaleUnit} />
    </div>
  );
};
