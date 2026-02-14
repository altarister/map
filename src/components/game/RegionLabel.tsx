import { memo } from 'react';
import { geoCentroid } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import type { AnswerFeedback, GameState } from '../../types/game';
import type { RegionFeature } from '../../types/geo';
import { useSettings } from '../../contexts/SettingsContext';

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

// Theme Color Definitions for Labels
const THEME_LABEL_COLORS = {
  tactical: {
    cityText: '#e5e7eb', // gray-200
    districtText: '#9ca3af', // gray-400
    answered: '#22c55e', // green-500
    correct: '#4ade80', // green-400
    wrong: '#ef4444', // red-500
    shadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' // Black outline
  },
  kids: {
    cityText: '#1e3a8a', // blue-900 (High Contrast)
    districtText: '#475569', // slate-600
    answered: '#2563eb', // blue-600
    correct: '#3b82f6', // blue-500
    wrong: '#ef4444', // red-500
    shadow: '1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff' // White outline
  }
};

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
  const { theme } = useSettings();
  const colors = THEME_LABEL_COLORS[theme];

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
  // 4. 스타일 계산 (Tactical Dark Mode)
  const isCity = fontScale > 1.2; // City labels are larger

  // Base Style
  let textColor = isCity ? colors.cityText : colors.districtText;
  let fontWeight = isCity ? 'bold' : 'normal';
  let zIndex = isCity ? 10 : 1;

  // Highlight Logic
  const isAnswered = answeredRegions.has(code);
  const isCorrectFeedback = lastFeedback?.regionCode === code && lastFeedback?.isCorrect;
  const isWrongFeedback = lastFeedback?.regionCode === code && !lastFeedback?.isCorrect;

  if (isAnswered) {
    textColor = colors.answered;
    fontWeight = 'bold';
  }
  if (isCorrectFeedback) {
    textColor = colors.correct;
    fontWeight = '900'; // font-black
    zIndex = 20;
  }
  if (isWrongFeedback) {
    textColor = colors.wrong;
    fontWeight = '900'; // font-black
    zIndex = 20;
  }

  // 2. Fixed Screen Font Size Logic
  // 줌 레벨이 변해도 텍스트는 항상 스크린 기준 12px~14px 크기로 보여야 함
  // SVG 내부에서는 scale이 적용되므로, 폰트 크기를 역으로 나눠줘야 함
  const TARGET_SCREEN_FONT_SIZE = 14 * fontScale; // px
  const finalFontSize = TARGET_SCREEN_FONT_SIZE / transform.k;

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={finalFontSize}
      fill={textColor}
      fontWeight={fontWeight}
      fontFamily="system-ui"
      style={{
        pointerEvents: 'none',
        textShadow: colors.shadow, // Outline for contrast
        transition: 'fill 0.2s ease, opacity 0.2s ease',
        zIndex: zIndex,
      }}
    >
      {name}
    </text>
  );
});

RegionLabel.displayName = 'RegionLabel';
