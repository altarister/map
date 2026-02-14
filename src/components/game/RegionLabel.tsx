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
}

export const RegionLabel = memo(({
  feature,
  projection,
  transform,
  gameState,
  answeredRegions,
  lastFeedback,
  fontScale = 1
}: RegionLabelProps) => {
  const code = feature.properties.code;
  const name = feature.properties.name;
  const centroid = geoCentroid(feature);

  // Convert GeoJSON coordinates to SVG coordinates
  const coords = projection(centroid);
  if (!coords) return null;

  const [x, y] = coords;

  const shouldShowLabel = () => {
    // Show labels in Level 2 (시/군) always
    // In Level 3 (읍/면/동), show only for answered or feedback regions
    if (transform.k < 1.5) return true; // Level 2

    // Level 3: show only important labels
    return answeredRegions.has(code) || lastFeedback?.regionCode === code;
  };

  const getLabelColor = () => {
    if (answeredRegions.has(code)) return '#1e293b';
    if (lastFeedback?.regionCode === code) {
      return lastFeedback.isCorrect ? '#15803d' : '#b91c1c';
    }
    return '#334155';
  };

  if (!shouldShowLabel()) return null;

  // Font size calculation (inverse to zoom level)
  const baseSize = 12 * fontScale;
  const fontSize = Math.max(8, Math.min(16, baseSize / transform.k));

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
        textShadow: '0px 0px 2px rgba(255,255,255,0.8)',
        transition: 'fill 0.2s ease'
      }}
    >
      {name}
    </text>
  );
});

RegionLabel.displayName = 'RegionLabel';
