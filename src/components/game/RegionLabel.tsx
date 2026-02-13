import { Marker } from '@vnedyalk0v/react19-simple-maps';
import { geoCentroid } from 'd3-geo';
import type { AnswerFeedback, GameState } from '../../types/game';
import type { RegionFeature } from '../../types/geo';

interface RegionLabelProps {
  feature: RegionFeature;
  gameState: GameState;
  answeredRegions: Set<string>;
  lastFeedback: AnswerFeedback | null;
  zoom: number; // 줌 레벨 추가
  fontScale: number; // 사용자 설정 폰트 크기 배율
}

import { memo } from 'react';

// ... (existing helper function logic if any, or just memoize the component)

export const RegionLabel = memo(({
  feature,
  gameState,
  answeredRegions,
  lastFeedback,
  zoom,
  fontScale
}: RegionLabelProps) => {
  const code = feature.properties.code;
  const name = feature.properties.name;
  const centroid = geoCentroid(feature); // [long, lat]

  const shouldShowLabel = () => {
    // LOD: 상세 지도 모드에서는 기본적으로 라벨 표시
    // 성능 최적화가 필요하다면 여기서 줌 레벨에 따른 필터링 추가 가능
    return true;
  };

  const getLabelColor = () => {
    if (answeredRegions.has(code)) return '#1e293b';
    if (lastFeedback?.regionCode === code) {
      return lastFeedback.isCorrect ? '#15803d' : '#b91c1c';
    }
    return '#334155';
  };

  if (!shouldShowLabel()) return null;

  // 폰트 크기 계산 (줌 레벨 반비례)
  const baseSize = fontScale || 12;
  const baseFontSize = Math.max(8, baseSize / Math.max(1, zoom * 0.5));

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Marker coordinates={centroid as any}>
      <g style={{ pointerEvents: 'none' }}>
        <text
          textAnchor="middle"
          dominantBaseline="central"
          y={0}
          style={{
            fontFamily: 'system-ui',
            fontSize: `${baseFontSize}px`,
            fill: getLabelColor(),
            fontWeight: '600',
            textShadow: '0px 0px 2px rgba(255,255,255,0.8)',
            transition: 'all 0.2s ease'
          }}
        >
          {name}
        </text>
      </g>
    </Marker>
  );
});

RegionLabel.displayName = 'RegionLabel';
