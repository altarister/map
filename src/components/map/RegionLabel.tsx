/* eslint-disable @typescript-eslint/no-unused-vars */
import { memo, useMemo } from 'react';
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
  isWatermark?: boolean;
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
  answeredRegions,
  lastFeedback,
  fontScale = 1,
  baseArea = 0,
  isWatermark = false
}: RegionLabelProps) => {
  const { theme } = useSettings();
  const colors = THEME_LABEL_COLORS[theme];

  const code = feature.properties.code;

  const name = feature.properties.name;

  // 워터마크가 이미 부모 읍/면 이름을 크게 보여주므로, 개별 라벨은 자기 자신의 이름(리/동 등)만 1줄로 표기합니다.
  const fullNameLines: string[] = [name || ''];

  // 무거운 위경도 중심점 연산(geoCentroid) 및 픽셀 투영 연산 캐싱 (렉 방지)
  const coords = useMemo(() => {
    const centroid = geoCentroid(feature);
    return projection(centroid);
  }, [feature, projection]);

  if (!coords) return null;

  // gRef 그룹의 CSS transform(translate+scale)이 좌표를 자동 보정해줌.
  // font-size = 14/k 로 scale을 상쇄해 항상 14px 시각 크기를 유지.
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

  if (isAnswered && !isWatermark) {
    textColor = colors.answered;
    fontWeight = 'bold';
  }
  if (isCorrectFeedback && !isWatermark) {
    textColor = colors.correct;
    fontWeight = '900'; // font-black
    zIndex = 20;
  }
  if (isWrongFeedback && !isWatermark) {
    textColor = colors.wrong;
    fontWeight = '900'; // font-black
    zIndex = 20;
  }

  // 2. Fixed Screen Font Size Logic
  // 워터마크인 경우 투명도를 대폭 낮추고 이벤트 오버레이와 뒤섞이지 않게 처리
  const opacity = isWatermark ? 0.35 : 1;
  const textShadow = isWatermark ? 'none' : colors.shadow;

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
      fillOpacity={opacity}
      fontWeight={fontWeight}
      fontFamily="system-ui"
      style={{
        pointerEvents: 'none',
        textShadow: textShadow, // Outline for contrast
        transition: 'fill 0.2s ease, opacity 0.2s ease',
        zIndex: zIndex,
      }}
    >
      {fullNameLines.map((line, i) => (
        <tspan
          key={`${code}-line-${i}`}
          x={x}
          dy={i === 0 ? (fullNameLines.length > 1 ? `-${finalFontSize * 0.4}px` : '0') : `${finalFontSize * 1.1}px`}
        >
          {line}
        </tspan>
      ))}
    </text>
  );
});

RegionLabel.displayName = 'RegionLabel';
