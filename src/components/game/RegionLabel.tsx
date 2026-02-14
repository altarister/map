import { memo } from 'react';
import { geoCentroid } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import type { AnswerFeedback, GameState } from '../../types/game';
import type { RegionFeature } from '../../types/geo';

interface RegionLabelProps {
  feature: RegionFeature;
  projection: GeoProjection;
  transform: { x: number; y: number; k: number };
  gameState: GameState;
  answeredRegions: Set<string>;
  lastFeedback: AnswerFeedback | null;
  fontScale?: number;
  baseArea?: number;
}

export const RegionLabel = memo(({
  feature,
  projection,
  transform,
  gameState,
  answeredRegions,
  lastFeedback,
  fontScale = 1,
  baseArea = 0
}: RegionLabelProps) => {
  const code = feature.properties.code;
  const name = feature.properties.name;
  const centroid = geoCentroid(feature);

  // Convert GeoJSON coordinates to SVG coordinates
  const coords = projection(centroid);
  if (!coords) return null;

  const [x, y] = coords;

  // 1. Area-based Visibility Check (Performance Optimized)
  // 화면상 면적이 너무 작으면 라벨을 그리지 않음 (Clutter 방지)
  // 기준: 50x50px (2500px²)
  const screenArea = baseArea * transform.k * transform.k;
  const VISIBILITY_THRESHOLD = 2500;

  if (baseArea > 0 && screenArea < VISIBILITY_THRESHOLD) {
    // 단, 정답을 맞췄거나 피드백이 있는 경우는 예외적으로 보여줄 수 있음 (기획에 따라 결정)
    // 현재는 "좁은 땅에는 글씨를 쓰지 않는다" 원칙 고수
    return null;
  }

  // Visibility is controlled by parent (Map.tsx)
  // based on Zoom Level (Macro vs Micro View)

  const getLabelColor = () => {
    if (answeredRegions.has(code)) return '#1e293b';
    if (lastFeedback?.regionCode === code) {
      return lastFeedback.isCorrect ? '#15803d' : '#b91c1c';
    }
    return '#334155';
  };

  // 2. Fixed Screen Font Size Logic
  // 줌 레벨이 변해도 텍스트는 항상 스크린 기준 12px~14px 크기로 보여야 함
  // SVG 내부에서는 scale이 적용되므로, 폰트 크기를 역으로 나눠줘야 함
  const TARGET_SCREEN_FONT_SIZE = 14 * fontScale; // px
  const fontSize = TARGET_SCREEN_FONT_SIZE / transform.k;

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={fontSize}
      fill={getLabelColor()}
      fontWeight="600"
      fontFamily="system-ui"
      style={{
        pointerEvents: 'none',
        textShadow: '0px 0px 3px rgba(255,255,255,0.9), 0px 0px 1px rgba(255,255,255,1)', // 하얀색 테두리 효과 강화
        transition: 'fill 0.2s ease, opacity 0.2s ease'
      }}
    >
      {name}
    </text>
  );
});

RegionLabel.displayName = 'RegionLabel';
