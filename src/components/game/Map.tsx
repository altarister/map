import { useCallback, useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from '@vnedyalk0v/react19-simple-maps';
import { geoCentroid } from 'd3-geo';
import { useGame } from '../../contexts/GameContext';
import type { RegionFeature } from '../../types/geo';

// 상수: 지도 투영 설정
const PROJECTION_CONFIG = {
  scale: 8000,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  center: [127.25, 37.55] as any, // 경기도 중심
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rotate: [0, 0, 0] as any,
};

const CITY_COLORS = [
  '#fee2e2', // Red-100
  '#ffedd5', // Orange-100
  '#fef3c7', // Amber-100
  '#ecfccb', // Lime-100
  '#d1fae5', // Emerald-100
  '#cffafe', // Cyan-100
  '#e0f2fe', // Sky-100
  '#dbeafe', // Blue-100
  '#e0e7ff', // Indigo-100
  '#fae8ff', // Fuchsia-100
  '#fce7f3', // Pink-100
  '#ffe4e6', // Rose-100
];

const CITY_HOVER_COLORS = [
  '#fca5a5', // Red-300
  '#fdba74', // Orange-300
  '#fcd34d', // Amber-300
  '#bef264', // Lime-300
  '#6ee7b7', // Emerald-300
  '#67e8f9', // Cyan-300
  '#7dd3fc', // Sky-300
  '#93c5fd', // Blue-300
  '#a5b4fc', // Indigo-300
  '#e879f9', // Fuchsia-300
  '#f9a8d4', // Pink-300
  '#fda4af', // Rose-300
];

export const Map = () => {
  const { mapData, loading, gameState, checkAnswer, error, lastFeedback, answeredRegions } = useGame();
  
  // Hover 상태 관리
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // 이벤트 핸들러
  const handleRegionClick = useCallback((regionCode: string) => {
    if (gameState !== 'PLAYING') return;
    checkAnswer(regionCode);
  }, [gameState, checkAnswer]);

  const handleRegionEnter = useCallback((regionCode: string) => {
    if (gameState === 'PLAYING') {
      setHoveredRegion(regionCode);
    }
  }, [gameState]);

  const handleRegionLeave = useCallback(() => {
    setHoveredRegion(null);
  }, []);

  // 색상 결정 로직
  const getFillColor = (code: string, isHovered: boolean = false) => {
    // 1. 피드백 상태 (정답/오답 확인 중) - Hover보다 우선순위 높음 (명확한 피드백 위해)
    // 하지만 사용자는 "Hover 시 진해지는 효과"를 원하므로, 정답/오답 상태가 아닐 때만 Hover 적용?
    // 보통 게임에서는 Hover가 최상위 피드백인 경우가 많음 (내가 뭘 누르려는지 알아야 하니까)
    
    // 2. Hover 상태 (만약 피드백 중이 아니라면)
    if (isHovered && !lastFeedback) {
        // 기존 색상보다 진한 색상 반환
        const cityCode = code.substring(0, 4);
        const colorIndex = parseInt(cityCode, 10) % CITY_COLORS.length;
        return CITY_HOVER_COLORS[colorIndex];
    }

    if (lastFeedback) {
      if (lastFeedback.isCorrect && lastFeedback.regionCode === code) return '#22c55e'; // 정답: 초록
      if (!lastFeedback.isCorrect) {
        if (lastFeedback.regionCode === code) return '#ef4444'; // 내가 찍은 오답: 빨강
        if (lastFeedback.correctCode === code) return '#3b82f6'; // 실제 정답: 파랑
      }
    }

    // 3. 이미 맞춘 지역
    if (answeredRegions.has(code)) return '#86efac'; // 정답 맞춤: 연한 초록

    // 4. 기본 지역 색상 (시/군 구분에 따른 색상)
    const cityCode = code.substring(0, 4);
    const colorIndex = parseInt(cityCode, 10) % CITY_COLORS.length;
    return CITY_COLORS[colorIndex];
  };

  const getStrokeColor = (code: string, isHovered: boolean = false) => {
    // 1. Hover 상태
    if (isHovered) return '#4f46e5'; // Indigo-600

    // 2. 피드백 상태
    if (lastFeedback) {
      if (lastFeedback.isCorrect && lastFeedback.regionCode === code) return '#15803d';
      if (!lastFeedback.isCorrect) {
        if (lastFeedback.regionCode === code) return '#b91c1c';
        if (lastFeedback.correctCode === code) return '#1d4ed8';
      }
    }

    // 3. 이미 맞춘 지역
    if (answeredRegions.has(code)) {
      return '#16a34a'; // 정답 테두리: 진한 초록
    }
    
    // 4. 기본 테두리 색상
    return '#cbd5e1'; // Slate-300
  };

  const shouldShowLabel = (code: string) => {
    if (gameState !== 'PLAYING') return true;
    if (answeredRegions.has(code)) return true;
    if (lastFeedback && !lastFeedback.isCorrect && lastFeedback.correctCode === code) return true;
    return false;
  };

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
        <ZoomableGroup zoom={1} minZoom={0.5} maxZoom={8}>
          <Geographies geography={mapData}>
            {({ geographies }) => {
              // 렌더링 순서 재정렬: Hover > Answered/Feedback > Normal
              // 타입 단언을 통해 RegionFeature[] 로 취급
              // react-simple-maps의 타입 정의가 유연하지 않아 any 사용이 필요할 수 있음
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const typedGeographies = geographies as any[];
              
              const sortedGeographies = [...typedGeographies].sort((a, b) => {
                const codeA = a.properties?.code || '';
                const codeB = b.properties?.code || '';
                
                const isHoveredA = hoveredRegion === codeA;
                const isHoveredB = hoveredRegion === codeB;

                const isFeedbackA = lastFeedback && (lastFeedback.regionCode === codeA || lastFeedback.correctCode === codeA);
                const isFeedbackB = lastFeedback && (lastFeedback.regionCode === codeB || lastFeedback.correctCode === codeB);

                const isAnsweredA = answeredRegions.has(codeA);
                const isAnsweredB = answeredRegions.has(codeB);

                // 1. Hover (최상위)
                if (isHoveredA && !isHoveredB) return 1;
                if (!isHoveredA && isHoveredB) return -1;

                // 2. Feedback (상위)
                if (isFeedbackA && !isFeedbackB) return 1;
                if (!isFeedbackA && isFeedbackB) return -1;

                // 3. Answered (중위)
                if (isAnsweredA && !isAnsweredB) return 1;
                if (!isAnsweredA && isAnsweredB) return -1;

                return 0;
              });

              return sortedGeographies.map((geo) => {
                const feature = geo as RegionFeature;
                if (!feature.properties) return null;
                
                const code = feature.properties.code;
                const name = feature.properties.name;
                const isHovered = hoveredRegion === code;
                
                return (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  <g key={(geo as any).rsmKey || code}>
                    <Geography
                      geography={geo}
                      onMouseEnter={() => handleRegionEnter(code)}
                      onMouseLeave={handleRegionLeave}
                      onClick={() => handleRegionClick(code)}
                      style={{
                        default: {
                          fill: getFillColor(code, false),
                          stroke: getStrokeColor(code, false),
                          strokeWidth: answeredRegions.has(code) ? 2 : 1, 
                          outline: 'none',
                          transition: 'all 0.2s ease',
                          vectorEffect: 'non-scaling-stroke', // 확대해도 두께 유지
                        },
                        hover: {
                          fill: getFillColor(code, true),
                          stroke: '#6366f1', 
                          strokeWidth: 3, 
                          outline: 'none',
                          cursor: gameState === 'PLAYING' ? 'pointer' : 'default',
                          vectorEffect: 'non-scaling-stroke',
                        },
                        pressed: {
                          fill: getFillColor(code, isHovered),
                          outline: 'none',
                          vectorEffect: 'non-scaling-stroke',
                        },
                      } as any}
                    />
                    
                    {/* 라벨 표시 */}
                    {shouldShowLabel(code) && (() => {
                      const centroid = geoCentroid(feature);
                      if (!centroid || !isFinite(centroid[0]) || !isFinite(centroid[1])) return null;

                      const isCorrectFeedback = lastFeedback?.isCorrect && lastFeedback.regionCode === code;
                      const isWrongFeedback = lastFeedback && !lastFeedback.isCorrect && lastFeedback.regionCode === code;
                      const isAnswerHint = lastFeedback && !lastFeedback.isCorrect && lastFeedback.correctCode === code;
                      const isAnswered = answeredRegions.has(code);

                      let labelColor = '#334155';
                      let fontWeight = '500';
                      let fontSize = '3px';
                      
                      if (isCorrectFeedback) { labelColor = '#ffffff'; fontWeight = '700'; fontSize = '4px'; } 
                      else if (isWrongFeedback) { labelColor = '#ffffff'; fontWeight = '700'; fontSize = '4px'; }
                      else if (isAnswerHint) { labelColor = '#ffffff'; fontWeight = '700'; fontSize = '4px'; }
                      else if (isAnswered) { labelColor = '#166534'; fontWeight = '600'; } 

                      return (
                         <text
                          x={centroid[0]}
                          y={centroid[1]}
                          textAnchor="middle"
                          dominantBaseline="central"
                          style={{
                            fontSize,
                            fontWeight,
                            fill: labelColor,
                            pointerEvents: 'none', // 마우스 이벤트 방해 금지
                            userSelect: 'none',
                            textShadow: isAnswered ? '0px 0px 2px rgba(255,255,255,0.8)' : 'none'
                          }}
                        >
                          {name}
                        </text>
                      );
                    })()}
                  </g>
                );
              });
            }}
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
};
