import type { GeoProjection } from 'd3-geo';
import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';
import type { CallFilterQuestion, CallItem } from '../../game/core/types';

interface RouteAnimationLayerProps {
  projection: GeoProjection;
}

export const RouteAnimationLayer = ({ projection }: RouteAnimationLayerProps) => {
  const { currentStage, gameState, currentQuestion, lastFeedback, selectedCallId, isGpsOn, confirmedCallIds } = useGame();
  const { theme } = useSettings();

  if (currentStage !== 2 || gameState !== 'PLAYING') return null;
  if (!currentQuestion || currentQuestion.type !== 'CALL_FILTER') return null;

  const question = currentQuestion as CallFilterQuestion;
  const isTactical = theme === 'tactical';

  // 렌더링 대상 콜 수집 로직
  // 1. 피드백 창이 떴으면 오직 해당 콜만
  // 2. 특정 콜 요소가 클릭되었다면 해당 콜 위주로 노출
  // 3. (사용자 요청) GPS가 켜져 있다면 출제된 전체 콜의 시작/도착지 표시
  // 4. 내 장부에 확정된 콜(confirmedCallIds)도 보여주기 (합짐 동선 파악)
  
  let callsToRender: CallItem[] = [];
  
  if (lastFeedback?.callData) {
    callsToRender = [lastFeedback.callData as CallItem];
  } else if (selectedCallId) {
    const selected = question.calls.find((c: any) => c.id === selectedCallId);
    if (selected) callsToRender = [selected];
  } else {
    // 아무것도 선택되지 않았을 때 다중 표출 로직
    const callMap = new Map<string, CallItem>();
    
    // GPS ON 상태면 리스트(신규 오더 목록)에 있는 진행 중 콜들을 지도에 전부 그림
    if (isGpsOn) {
      question.calls.forEach(c => callMap.set(c.id, c));
    }
    
    // 확정 오더들도 무조건 보여준다 (합짐용)
    confirmedCallIds.forEach(id => {
      const confirmed = question.calls.find((c: any) => c.id === id);
      if (confirmed) callMap.set(id, confirmed);
    });

    callsToRender = Array.from(callMap.values());
  }

  return (
    <g id="layer-route-animation" style={{ pointerEvents: 'none' }}>
      {/* 1. 기사 현위치 마커 (가장 밑에 렌더링되도록) */}
      {question.driverLocation && (() => {
        const pDriver = projection(question.driverLocation.centroid);
        if (!pDriver) return null;
        return (
          <g id="driver-location-marker">
            <circle cx={pDriver[0]} cy={pDriver[1]} r={6} fill="#ef4444" stroke="#ffffff" strokeWidth={2} className="animate-pulse" />
            <text x={pDriver[0] + 10} y={pDriver[1] + 4} fill="#ef4444" fontSize={12} fontWeight="bold" style={{ textShadow: '0px 0px 3px rgba(255,255,255,0.8)' }}>
              내 위치 ({question.driverLocation.name})
            </text>
          </g>
        );
      })()}

      {/* 2. 대상 배차 콜 경로 멀티플 렌더링 */}
      {callsToRender.map(call => {
        const pStart = projection(call.startRegion.centroid); // 상차지
        const pEnd = projection(call.targetRegion.centroid);  // 하차지
        const pDriver = question.driverLocation ? projection(question.driverLocation.centroid) : null;
        
        if (!pStart || !pEnd) return null;

        const isConfirmed = confirmedCallIds.includes(call.id);
        const isActive = call.id === selectedCallId || call.id === lastFeedback?.callData?.id;

        // 선택되었거나 확정된 건 더 두껍고 명확하게 표시
        const strokeWidth = isActive || isConfirmed ? 3 : 1.5;
        // 색상 계열 분리 (택티컬 모드 지원)
        const primaryColor = isTactical ? '#10b981' : '#3b82f6';
        const color = isConfirmed ? '#9333ea' : primaryColor; // 확정 건은 보라색
        const opacity = isActive || isConfirmed ? 1 : 0.6; // 일반 백그라운드 콜은 살짝 투명하게

        // 공차 경로 (내 위치 -> 상차지) - 연한 점선 (선택 시에만 렌더링 권장)
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
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.2; // radius for arc (곡률)
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
              {isConfirmed ? '픽업' : '상차'}({call.startRegion.name})
            </text>

            {/* 하차지 점 및 텍스트 */}
            <circle cx={pEnd[0]} cy={pEnd[1]} r={strokeWidth * 1.5} fill={color} />
            <text x={pEnd[0] + 8} y={pEnd[1] + 3} fill={color} fontSize={isActive || isConfirmed ? 13 : 11} fontWeight="bold" style={{ textShadow: '0px 0px 3px rgba(255,255,255,0.8)' }}>
              {isConfirmed ? '배송' : '하차'}({call.targetRegion.name})
            </text>
          </g>
        );
      })}
    </g>
  );
};
