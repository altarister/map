import type { GeoProjection } from 'd3-geo';
import { useMemo } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useDispatchContext } from '../../contexts/DispatchContext';
import type { CallFilterQuestion, CallItem } from '../../game/core/types';
import { RouteOptimizer } from '../../game/stages/Stage2_Route/optimizer';
import type { RoutePoint } from '../../game/stages/Stage2_Route/optimizer';

interface RouteAnimationLayerProps {
  projection: GeoProjection;
}

export const RouteAnimationLayer = ({ projection }: RouteAnimationLayerProps) => {
  const { currentStage, gameState, currentQuestion, lastFeedback } = useGame();
  const { selectedCallId, isGpsOn, confirmedCalls, streamingCalls, activeTab } = useDispatchContext();
  const { theme } = useSettings();

  // [Hooks 규칙 준수] useMemo는 조건부 블록 바깥(컴포넌트 최상단)에서 호출해야 합니다
  const routeResult = useMemo(() => {
    // Stage2 전용: 문제 데이터 내의 driverLocation에 기사의 정확한 현위치(centroid 포함)가 들어있음
    const callFilterQuestion = currentQuestion as CallFilterQuestion;
    const driverLoc = callFilterQuestion?.driverLocation;

    if (!driverLoc || confirmedCalls.length === 0) return null;
    
    // startLocation을 driverLoc의 데이터로 구성
    return RouteOptimizer.analyzeBatch(confirmedCalls, { 
      code: driverLoc.code, 
      name: driverLoc.name, 
      center: driverLoc.centroid 
    });
  }, [confirmedCalls, currentQuestion]);

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
        {routeResult.orderedPoints.map((pt: RoutePoint, idx: number) => {
          const p = projection(pt.centroid);
          if (!p) return null;
          
          let labelText = '';
          if (pt.type === 'START') {
            labelText = `출발지(${pt.name})`;
          } else if (pt.type === 'PICKUP') {
            labelText = `상차${pt.waypointIndex || 1}(${pt.name})`;
          } else if (pt.type === 'DROPOFF') {
            labelText = `하차${pt.waypointIndex || 1}(${pt.name})`;
          }

          return (
            <g key={`point-${idx}`}>
              <circle cx={p[0]} cy={p[1]} r={idx === 0 ? 8 : 5} fill={pt.type === 'DROPOFF' ? '#10b981' : (idx === 0 ? '#ef4444' : '#4f46e5')} stroke="#fff" strokeWidth={2} />
              <text x={p[0] + 10} y={p[1] + 4} fill={pt.type === 'DROPOFF' ? '#047857' : (idx === 0 ? '#ef4444' : '#4f46e5')} fontSize={12} fontWeight="bold" style={{ textShadow: '0px 0px 3px rgba(255,255,255,0.8)' }}>
                {labelText}
              </text>
            </g>
          );
        })}
      </g>
    );
  }

  // ================= [PLAYING 모드] 개별 콜 렌더링 로직 =================
  let callsToRender: CallItem[] = [];
  
  if (lastFeedback?.callData) {
    // 피드백 중이면 해당 콜만
    callsToRender = [lastFeedback.callData as CallItem];
  } else if (selectedCallId) {
    // 특정 콜 선택 시 해당 콜만
    const selected = streamingCalls.find((c: any) => c.id === selectedCallId) || confirmedCalls.find((c: any) => c.id === selectedCallId);
    if (selected) callsToRender = [selected];
  } else if (activeTab === 'CONFIRMED') {
    // [완료 탭] 내 장부의 확정 콜 전부 표시
    callsToRender = [...confirmedCalls];
  } else {
    // [신규 탭] GPS 힌트 모드: GPS ON이면 최신 스트리밍 콜 1개만 표시
    if (isGpsOn && streamingCalls.length > 0) {
      callsToRender = [streamingCalls[0]];
    }
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
        const pDriver = callFilterQuestion.driverLocation ? projection(callFilterQuestion.driverLocation.centroid) : null;
        
        const isConfirmed = confirmedCalls.some(c => c.id === call.id);
        const isActive = call.id === selectedCallId || call.id === lastFeedback?.callData?.id;

        const strokeWidth = isActive || isConfirmed ? 3 : 1.5;
        const primaryColor = isTactical ? '#10b981' : '#3b82f6';
        const color = isConfirmed ? '#9333ea' : primaryColor; 
        const opacity = isActive || isConfirmed ? 1 : 0.6; 

        // ===== 다중 웨이포인트 지원: 모든 pickup → 모든 dropoff 순차 연결 =====
        const waypoints: Array<{ point: [number, number]; label: string; type: 'PICKUP' | 'DROPOFF' }> = [];
        
        call.pickups.forEach((p, i) => {
          const proj = projection(p.centroid);
          if (proj) {
            const suffix = call.pickups.length > 1 ? `${i + 1}` : '';
            waypoints.push({ point: proj as [number, number], label: `상차${suffix}(${p.name})`, type: 'PICKUP' });
          }
        });
        call.dropoffs.forEach((d, i) => {
          const proj = projection(d.centroid);
          if (proj) {
            const suffix = call.dropoffs.length > 1 ? `${i + 1}` : '';
            waypoints.push({ point: proj as [number, number], label: `하차${suffix}(${d.name})`, type: 'DROPOFF' });
          }
        });

        if (waypoints.length === 0) return null;

        // 공차 경로 (내 위치 -> 첫 상차지) 점선
        const pickupLineRender = (pDriver && (isActive || isConfirmed)) ? (
          <line
            x1={pDriver[0]} y1={pDriver[1]}
            x2={waypoints[0].point[0]} y2={waypoints[0].point[1]}
            stroke="#ef4444" 
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.5}
          />
        ) : null;

        return (
          <g key={`route-${call.id}`} style={{ opacity, transition: 'opacity 0.3s ease' }}>
            {pickupLineRender}

            {/* 웨이포인트 간 연결선 (순차: pickup1 → pickup2 → dropoff1 → dropoff2) */}
            {waypoints.map((wp, idx) => {
              if (idx === 0) return null;
              const prev = waypoints[idx - 1];
              const dx = wp.point[0] - prev.point[0];
              const dy = wp.point[1] - prev.point[1];
              const dr = Math.sqrt(dx * dx + dy * dy) * 1.2;
              const d = `M${prev.point[0]},${prev.point[1]} A${dr},${dr} 0 0,1 ${wp.point[0]},${wp.point[1]}`;
              return (
                <path
                  key={`seg-${call.id}-${idx}`}
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  className={isActive ? "animate-pulse" : ""}
                />
              );
            })}

            {/* 각 웨이포인트 마커 + 텍스트 */}
            {waypoints.map((wp, idx) => {
              const dotColor = wp.type === 'PICKUP' ? '#f59e0b' : color;
              const fontSize = isActive || isConfirmed ? 13 : 11;
              return (
                <g key={`wp-${call.id}-${idx}`}>
                  <circle cx={wp.point[0]} cy={wp.point[1]} r={strokeWidth * 1.5} fill={dotColor} />
                  <text x={wp.point[0] + 8} y={wp.point[1] + 3} fill={dotColor} fontSize={fontSize} fontWeight="bold" style={{ textShadow: '0px 0px 3px rgba(255,255,255,0.8)' }}>
                    {wp.label}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
};
