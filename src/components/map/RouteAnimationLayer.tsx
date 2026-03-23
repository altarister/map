import type { GeoProjection } from 'd3-geo';
import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';
import type { CallFilterQuestion } from '../../game/core/types';

interface RouteAnimationLayerProps {
  projection: GeoProjection;
}

export const RouteAnimationLayer = ({ projection }: RouteAnimationLayerProps) => {
  const { currentStage, gameState, currentQuestion, lastFeedback } = useGame();
  const { theme } = useSettings();

  if (currentStage !== 2 || gameState !== 'PLAYING') return null;
  if (!currentQuestion || currentQuestion.type !== 'CALL_FILTER') return null;

  const question = currentQuestion as CallFilterQuestion;
  const isTactical = theme === 'tactical';

  // 피드백 모달에서 판정 중인 콜 데이터가 있으면 그 콜을 우선하여 시각화
  const activeCall = lastFeedback?.callData;

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

      {/* 2. 채점 피드백 시 활성화된(사용자가 클릭했던) 단일 배차 콜 경로 렌더링 */}
      {activeCall && (() => {
          const call = activeCall;
          const pStart = projection(call.startRegion.centroid); // 상차지
          const pEnd = projection(call.targetRegion.centroid);  // 하차지
          const pDriver = question.driverLocation ? projection(question.driverLocation.centroid) : null;
          
          if (!pStart || !pEnd) return null;

          const color = isTactical ? '#10b981' : '#3b82f6'; // emerald-500 or blue-500
          const strokeWidth = 3;

        // 공차 경로 (내 위치 -> 상차지) - 연한 점선 (직선)
        const pickupLineRender = pDriver ? (
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
          <g key={call.id} style={{ opacity: 1, transition: 'opacity 0.3s ease' }}>
            {pickupLineRender}
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              className="animate-pulse"
            />
            {/* 상차지 점 */}
            <circle cx={pStart[0]} cy={pStart[1]} r={strokeWidth * 1.5} fill="#f59e0b" />
            {/* 하차지 점 */}
            <circle cx={pEnd[0]} cy={pEnd[1]} r={strokeWidth * 1.5} fill={color} />
          </g>
        );
      })()}
    </g>
  );
};
