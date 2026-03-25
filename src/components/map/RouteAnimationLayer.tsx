import type { GeoProjection } from 'd3-geo';
import * as d3Geo from 'd3-geo';
import { useMemo } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useDispatchContext } from '../../contexts/DispatchContext';
import type { CallFilterQuestion, CallItem, LocationPoint } from '../../game/core/types';
import { RouteOptimizer } from '../../game/stages/Stage2_Route/optimizer';

interface RouteAnimationLayerProps {
  projection: GeoProjection;
}

export const RouteAnimationLayer = ({ projection }: RouteAnimationLayerProps) => {
  const { currentStage, gameState, currentQuestion, lastFeedback, currentLocation, fullMapData } = useGame();
  const { selectedCallId, isGpsOn, confirmedCalls, streamingCalls } = useDispatchContext();
  const { theme } = useSettings();

  // [Hooks 규칙 준수] useMemo는 조건부 블록 바깥(컴포넌트 최상단)에서 호출해야 합니다
  const routeResult = useMemo(() => {
    if (!currentLocation || confirmedCalls.length === 0) return null;
    const feature = (fullMapData || []).find((f: any) => f.properties?.code === currentLocation.code);
    const centroid: [number, number] = feature ? d3Geo.geoCentroid(feature) : [0, 0];
    return RouteOptimizer.analyzeBatch(confirmedCalls, { ...currentLocation, center: centroid });
  }, [confirmedCalls, currentLocation, fullMapData]);

  if (currentStage !== 2 || (gameState !== 'PLAYING' && gameState !== 'RESULT')) return null;
  if (!currentQuestion || currentQuestion.type !== 'CALL_FILTER') return null;

  const isTactical = theme === 'tactical';
  const callFilterQuestion = currentQuestion as CallFilterQuestion;
  
  // ================= [RESULT 모드] 합짐 5콜 종합 궤적 렌더링 =================
  if (gameState === 'RESULT') {
    if (!routeResult) return null;

    // 경로점 D3 궤적 파싱
    const points = routeResult.orderedPoints
      .map(p => projection(p.centroid))
      .filter(p => p !== null) as [number, number][];

    if (points.length < 2) return null;

    const polylineData = points.map(p => `${p[0]},${p[1]}`).join(' ');

    return (
      <g id="layer-route-animation-result" style={{ pointerEvents: 'none' }}>
        {/* 다중 폴리라인 선 그리기 */}
        <polyline 
          points={polylineData}
          fill="none"
          stroke="#4f46e5" // Indigo-600
          strokeWidth={4}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="animate-in slide-in-from-left duration-1000 origin-left"
          style={{ 
            strokeDasharray: '20, 10', 
            animation: 'dash 30s linear infinite' 
          }}
        />
        {/* 각 경유지 마커 */}
        {routeResult.orderedPoints.map((pt: LocationPoint, idx: number) => {
          const p = projection(pt.centroid);
          if (!p) return null;
          return (
            <g key={`point-${idx}`}>
              <circle cx={p[0]} cy={p[1]} r={idx === 0 ? 8 : 5} fill={idx === 0 ? '#ef4444' : '#4f46e5'} stroke="#fff" strokeWidth={2} />
              <text x={p[0] + 10} y={p[1] + 4} fill={idx === 0 ? '#ef4444' : '#4f46e5'} fontSize={12} fontWeight="bold" style={{ textShadow: '0px 0px 3px rgba(255,255,255,0.8)' }}>
                {idx === 0 ? `START(${pt.name})` : `경유${idx}(${pt.name})`}
              </text>
            </g>
          );
        })}
      </g>
    );
  }

  // ================= [PLAYING 모드] 개별 콜 렌더링 로직 (기존) =================
  let callsToRender: CallItem[] = [];
  
  if (lastFeedback?.callData) {
    callsToRender = [lastFeedback.callData as CallItem];
  } else if (selectedCallId) {
    const selected = streamingCalls.find((c: any) => c.id === selectedCallId) || confirmedCalls.find((c: any) => c.id === selectedCallId);
    if (selected) callsToRender = [selected];
  } else {
    const callMap = new Map<string, CallItem>();
    if (isGpsOn && streamingCalls.length > 0) {
      callMap.set(streamingCalls[0].id, streamingCalls[0]);
    }
    confirmedCalls.forEach(call => {
      callMap.set(call.id, call);
    });
    callsToRender = Array.from(callMap.values());
  }

  return (
    <g id="layer-route-animation" style={{ pointerEvents: 'none' }}>
      {/* 1. 기사 현위치 마커 (가장 밑에 렌더링되도록) */}
      {currentQuestion.driverLocation && (() => {
        const pDriver = projection(currentQuestion.driverLocation!.centroid);
        if (!pDriver) return null;
        return (
          <g id="driver-location-marker">
            <circle cx={pDriver[0]} cy={pDriver[1]} r={6} fill="#ef4444" stroke="#ffffff" strokeWidth={2} className="animate-pulse" />
            <text x={pDriver[0] + 10} y={pDriver[1] + 4} fill="#ef4444" fontSize={12} fontWeight="bold" style={{ textShadow: '0px 0px 3px rgba(255,255,255,0.8)' }}>
              내 위치 ({currentQuestion.driverLocation!.name})
            </text>
          </g>
        );
      })()}

      {/* 2. 대상 배차 콜 경로 멀티플 렌더링 */}
      {callsToRender.map(call => {
        // [다중 웨이포인트 지원] 임시로 첫 번째 상/하차지만 선 긋기
        const pStart = projection(call.pickups[0].centroid); 
        const pEnd = projection(call.dropoffs[0].centroid);  
        const pDriver = callFilterQuestion.driverLocation ? projection(callFilterQuestion.driverLocation.centroid) : null;
        
        if (!pStart || !pEnd) return null;

        const isConfirmed = confirmedCalls.some(c => c.id === call.id);
        const isActive = call.id === selectedCallId || call.id === lastFeedback?.callData?.id;

        const strokeWidth = isActive || isConfirmed ? 3 : 1.5;
        const primaryColor = isTactical ? '#10b981' : '#3b82f6';
        const color = isConfirmed ? '#9333ea' : primaryColor; 
        const opacity = isActive || isConfirmed ? 1 : 0.6; 

        // 공차 경로 (내 위치 -> 상차지) 
        const pickupLineRender = (pDriver && (isActive || isConfirmed)) ? (
          <line
            x1={pDriver[0]} y1={pDriver[1]}
            x2={pStart[0]} y2={pStart[1]}
            stroke="#ef4444" 
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.5}
          />
        ) : null;

        // 곡선(아치) 배차 경로 (상차지 -> 하차지)
        const dx = pEnd[0] - pStart[0];
        const dy = pEnd[1] - pStart[1];
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.2; 
        const d = `M${pStart[0]},${pStart[1]} A${dr},${dr} 0 0,1 ${pEnd[0]},${pEnd[1]}`;

        return (
          <g key={`route-${call.id}`} style={{ opacity, transition: 'opacity 0.3s ease' }}>
            {pickupLineRender}
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              className={isActive ? "animate-pulse" : ""}
            />
            {/* 상차지 점 및 텍스트 */}
            <circle cx={pStart[0]} cy={pStart[1]} r={strokeWidth * 1.5} fill="#f59e0b" />
            <text x={pStart[0] + 8} y={pStart[1] + 3} fill="#f59e0b" fontSize={isActive || isConfirmed ? 13 : 11} fontWeight="bold" style={{ textShadow: '0px 0px 3px rgba(255,255,255,0.8)' }}>
              {isConfirmed ? '픽업' : '상차'}({call.pickups[0].name})
            </text>

            {/* 하차지 점 및 텍스트 */}
            <circle cx={pEnd[0]} cy={pEnd[1]} r={strokeWidth * 1.5} fill={color} />
            <text x={pEnd[0] + 8} y={pEnd[1] + 3} fill={color} fontSize={isActive || isConfirmed ? 13 : 11} fontWeight="bold" style={{ textShadow: '0px 0px 3px rgba(255,255,255,0.8)' }}>
              {isConfirmed ? '배송' : '하차'}({call.dropoffs[0].name})
            </text>
          </g>
        );
      })}
    </g>
  );
};
