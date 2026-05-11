import type { GeoProjection } from 'd3-geo';
import { useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useDispatchContext } from '../../contexts/DispatchContext';
import { useSettings } from '../../contexts/SettingsContext';
import type { CallFilterQuestion, CallItem, LocationPoint } from '../../game/core/types';
import type { RouteOptimizationResult, RoutePoint } from '../../game/stages/Stage2_Route/optimizer';

interface RouteAnimationLayerProps {
  projection: GeoProjection;
}

// ==========================================
// Sub-components for better readability
// ==========================================

const DriverLocationMarker = ({ projection, driverLocation }: { projection: GeoProjection, driverLocation: LocationPoint }) => {
  const pDriver = projection(driverLocation.centroid!);
  if (!pDriver) return null;
  return (
    <g id="driver-location-marker">
      <circle cx={pDriver[0]} cy={pDriver[1]} r={5} fill="#ef4444" stroke="#ffffff" strokeWidth={1.5} className="animate-pulse" style={{ filter: 'drop-shadow(0px 2px 3px rgba(239, 68, 68, 0.4))' }} />
      <text x={pDriver[0] + 8} y={pDriver[1] + 3} fill="#b91c1c" fontSize={11} fontWeight="800" style={{ textShadow: '0px 0px 4px rgba(255,255,255,1)' }}>
        내 위치
      </text>
    </g>
  );
};

const MergedRouteLayer = ({ projection, routeResult }: { projection: GeoProjection, routeResult: RouteOptimizationResult }) => {
  // 만약 외부 API 통신 실패로 휴리스틱 폴백이 작동했다면 렌더링 생략
  if (routeResult.isHeuristicRoute) {
    console.warn('[RouteAnimationLayer] 외부 경로 API 장애 상황입니다. 지도의 경로 선형 렌더링을 일시 생략합니다.');
    return null;
  }

  const points = (routeResult.realGeometry || [])
    .map(coord => projection(coord))
    .filter(p => p !== null) as [number, number][];

  if (points.length < 2) return null;

  const polylineData = points.map(p => `${p[0]},${p[1]}`).join(' ');

  let pickupCount = 0;
  let dropoffCount = 0;

  return (
    <g id="layer-route-animation-result" style={{ pointerEvents: 'none' }}>
      {/* 아웃라인 + 이너라인 이중 렌더링 */}
      <polyline points={polylineData} fill="none" stroke="#312e81" strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.8} />
      <polyline points={polylineData} fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" className="animate-in fade-in duration-1000" style={{ strokeDasharray: '6, 6', animation: 'dash 40s linear infinite' }} />
      
      {routeResult.orderedPoints.map((pt: RoutePoint, idx: number) => {
        const p = projection(pt.centroid);
        if (!p) return null;
        
        let labelText = '';
        if (pt.type === 'START') {
          labelText = `출발지(${pt.name})`;
        } else if (pt.type === 'PICKUP') {
          pickupCount++;
          labelText = `상차${pickupCount}(${pt.name})`;
        } else if (pt.type === 'DROPOFF') {
          dropoffCount++;
          labelText = `하차${dropoffCount}(${pt.name})`;
        }

        return (
          <g key={`point-${idx}`}>
            <circle cx={p[0]} cy={p[1]} r={idx === 0 ? 5.5 : 4} fill={pt.type === 'DROPOFF' ? '#10b981' : (idx === 0 ? '#ef4444' : '#4f46e5')} stroke="#fff" strokeWidth={1.5} style={{ filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.3))' }} />
            <text x={p[0] + 8} y={p[1] + 3} fill={pt.type === 'DROPOFF' ? '#065f46' : (idx === 0 ? '#b91c1c' : '#3730a3')} fontSize={11} fontWeight="800" style={{ textShadow: '0px 0px 4px rgba(255,255,255,0.9), 0px 0px 2px rgba(255,255,255,0.9)' }}>
              {labelText}
            </text>
          </g>
        );
      })}
    </g>
  );
};

interface StreamingCallRouteProps {
  call: CallItem;
  projection: GeoProjection;
  isConfirmed: boolean;
  isActive: boolean;
  isTactical: boolean;
  selectedCallRoute: any;
  pDriver: [number, number] | null;
}

const StreamingCallRoute = ({ call, projection, isConfirmed, isActive, isTactical, selectedCallRoute, pDriver }: StreamingCallRouteProps) => {
  const strokeWidth = isActive || isConfirmed ? 3.0 : 2.0;
  const primaryColor = isTactical ? '#10b981' : '#3b82f6';
  const color = isConfirmed ? '#9333ea' : primaryColor; 
  const opacity = isActive || isConfirmed ? 1.0 : 0.85; 

  const waypoints: Array<{ point: [number, number]; label: string; type: 'PICKUP' | 'DROPOFF' }> = [];
  
  call.pickups.forEach((p, i) => {
    const proj = projection(p.centroid);
    if (proj) waypoints.push({ point: proj as [number, number], label: `상차${call.pickups.length > 1 ? i + 1 : ''}(${p.name})`, type: 'PICKUP' });
  });
  call.dropoffs.forEach((d, i) => {
    const proj = projection(d.centroid);
    if (proj) waypoints.push({ point: proj as [number, number], label: `하차${call.dropoffs.length > 1 ? i + 1 : ''}(${d.name})`, type: 'DROPOFF' });
  });

  if (waypoints.length === 0) return null;

  const pickupLineRender = (pDriver && !isActive && !isConfirmed) ? (
    <line x1={pDriver[0]} y1={pDriver[1]} x2={waypoints[0].point[0]} y2={waypoints[0].point[1]} stroke="#ef4444" strokeWidth={2} strokeDasharray="6 6" />
  ) : null;

  return (
    <g style={{ opacity, transition: 'opacity 0.3s ease' }}>
      {pickupLineRender}
      {isActive ? (
        selectedCallRoute?.coordinates?.length ? (
          <path
            d={"M" + selectedCallRoute.coordinates.map((c: any) => projection(c)).filter(Boolean).map((p: any) => `${p[0]},${p[1]}`).join(" L")}
            fill="none" stroke={color} strokeWidth={strokeWidth} className="animate-pulse" style={{ filter: `drop-shadow(0px 0px 4px ${color}80)` }}
          />
        ) : null
      ) : (
        waypoints.map((wp, idx) => {
          if (idx === 0) return null;
          const prev = waypoints[idx - 1];
          return (
            <path key={idx} d={`M${prev.point[0]},${prev.point[1]} L${wp.point[0]},${wp.point[1]}`} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={isActive || isConfirmed ? "none" : "6 6"} className={isActive ? "animate-pulse" : ""} />
          );
        })
      )}
      {waypoints.map((wp, idx) => {
        const dotColor = wp.type === 'PICKUP' ? '#f59e0b' : color;
        const fontSize = isActive || isConfirmed ? 11 : 10;
        const markerR = isActive || isConfirmed ? 4 : 3;
        return (
          <g key={idx}>
            <circle cx={wp.point[0]} cy={wp.point[1]} r={markerR} fill={dotColor} stroke="#fff" strokeWidth={1} />
            {(isActive || isConfirmed) && (
              <text x={wp.point[0] + 6} y={wp.point[1] + 3} fill={dotColor} fontSize={fontSize} fontWeight="800" style={{ textShadow: '0px 0px 4px rgba(255,255,255,1)' }}>
                {wp.label}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
};

// ==========================================
// Main Layer Component
// ==========================================

export const RouteAnimationLayer = ({ projection }: RouteAnimationLayerProps) => {
  const { currentStage, gameState, currentQuestion, lastFeedback } = useGame();
  const { selectedCallId, isGpsOn, streamingCalls, activeTab } = useDispatchContext();
  const { theme } = useSettings();
  const { confirmedCalls, routeResult, calculateRouteResult, selectedCallRoute } = useDispatchContext();

  // gameState가 RESULT일 때 OSRM 좌표 계산 1회 호출 트리거 (전역 상태에 반영)
  useEffect(() => {
    if (gameState === 'RESULT' && currentStage === 2 && currentQuestion && currentQuestion.type === 'CALL_FILTER' && confirmedCalls.length > 0) {
      const driverLoc = currentQuestion.driverLocation;
      if (driverLoc) {
        calculateRouteResult(driverLoc);
      }
    }
  }, [confirmedCalls, currentQuestion, gameState, currentStage, calculateRouteResult]);

  if (currentStage !== 2 || (gameState !== 'PLAYING' && gameState !== 'RESULT')) return null;
  if (!currentQuestion || currentQuestion.type !== 'CALL_FILTER') return null;

  const isTactical = theme === 'tactical';
  const callFilterQuestion = currentQuestion as CallFilterQuestion;
  
  // 4. 완료탭 (목록 진입 시) 또는 6. 정산완료 결과 페이지 -> 전체를 묶은 합짐 선 렌더링
  const shouldRenderMergedRoute = gameState === 'RESULT' || (gameState === 'PLAYING' && activeTab === 'CONFIRMED' && !selectedCallId && !lastFeedback?.callData);

  // 개별 콜 렌더링을 위한 필터링 로직 (PLAYING 모드에서만 동작)
  let callsToRender: CallItem[] = [];
  let isDriverOnly = false; // 신규탭 + GPS OFF 시 기사 위치만 렌더링
  
  if (gameState === 'PLAYING') {
    if (lastFeedback?.callData) {
      callsToRender = [lastFeedback.callData as CallItem];
    } else if (selectedCallId) {
      const selected = streamingCalls.find(c => c.id === selectedCallId) || confirmedCalls.find(c => c.id === selectedCallId);
      if (selected) callsToRender = [selected];
    } else if (activeTab === 'ALL') {
      if (isGpsOn && streamingCalls.length > 0) {
        callsToRender = [streamingCalls[0]];
      } else if (!isGpsOn) {
        isDriverOnly = true;
      }
    }
  }

  const pDriver = callFilterQuestion.driverLocation ? projection(callFilterQuestion.driverLocation.centroid) : null;

  return (
    <g id="layer-route-animation" style={{ pointerEvents: 'none' }}>
      {callFilterQuestion.driverLocation && (
        <DriverLocationMarker projection={projection} driverLocation={callFilterQuestion.driverLocation} />
      )}

      {shouldRenderMergedRoute && routeResult && (
        <MergedRouteLayer projection={projection} routeResult={routeResult} />
      )}

      {!isDriverOnly && callsToRender.map(call => (
        <StreamingCallRoute
          key={call.id}
          call={call}
          projection={projection}
          isConfirmed={confirmedCalls.some(c => c.id === call.id)}
          isActive={call.id === selectedCallId || call.id === lastFeedback?.callData?.id}
          isTactical={isTactical}
          selectedCallRoute={selectedCallRoute}
          pDriver={pDriver as [number, number] | null}
        />
      ))}
    </g>
  );
};
// Vite HMR trigger
