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

  return (
    <g id="layer-route-animation" style={{ pointerEvents: 'none' }}>
      {question.calls.map(call => {
        const pStart = projection(call.startRegion.centroid);
        const pEnd = projection(call.targetRegion.centroid);
        if (!pStart || !pEnd) return null;

        const isSelected = lastFeedback?.regionCode === call.targetRegion.code;
        const isAnswered = !!lastFeedback;
        const opacity = isAnswered ? (isSelected ? 1 : 0.1) : 0.7;
        const color = isTactical ? '#10b981' : '#3b82f6'; // emerald-500 or blue-500
        const strokeWidth = isSelected ? 3 : 1.5;

        // 곡선(아치) 경로 그리기 (SVG Arc 사용)
        const dx = pEnd[0] - pStart[0];
        const dy = pEnd[1] - pStart[1];
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.2; // radius for arc (곡률)

        const d = `M${pStart[0]},${pStart[1]} A${dr},${dr} 0 0,1 ${pEnd[0]},${pEnd[1]}`;

        return (
          <g key={call.id} style={{ opacity, transition: 'opacity 0.3s ease' }}>
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={isSelected ? "none" : "6 4"}
              className={isSelected ? "animate-pulse" : ""}
            />
            {/* 출발지 점 */}
            <circle cx={pStart[0]} cy={pStart[1]} r={strokeWidth * 1.5} fill="#f59e0b" />
            {/* 도착지 점 */}
            <circle cx={pEnd[0]} cy={pEnd[1]} r={strokeWidth * 1.5} fill={color} />
          </g>
        );
      })}
    </g>
  );
};
