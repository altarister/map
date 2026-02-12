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

export const RegionLabel = memo(({ feature, gameState, answeredRegions, lastFeedback, zoom, fontScale }: RegionLabelProps) => {
  const code = feature.properties.code;
  const name = feature.properties.name;

  const shouldShowLabel = () => {
    if (gameState !== 'PLAYING') return true;
    // LOD: 줌 레벨이 2.5 미만이면 라벨 숨김 (너무 빽빽함 방지)
    // 단, 정답을 맞춘 지역이나 피드백 중인 지역은 항상 표시
    if (zoom < 2.5 && !answeredRegions.has(code) && !lastFeedback) return false;

    if (answeredRegions.has(code)) return true;
    
    if (lastFeedback) {
      // 1. 사용자가 선택한 오답 지역만 라벨 표시 (이중 피드백)
      if (!lastFeedback.isCorrect && lastFeedback.regionCode === code) return true;
      
      // 2. 실제 정답 지역은 이미 문제에 나와있으므로 라벨 숨김 (사용자 요청)
      if (lastFeedback.correctCode === code) return false;
    }
    
    return false;
  };

  if (!shouldShowLabel()) return null;

  const centroid = geoCentroid(feature);
  if (!centroid || !isFinite(centroid[0]) || !isFinite(centroid[1])) return null;

  const isWrongFeedback = lastFeedback && !lastFeedback.isCorrect && lastFeedback.regionCode === code;
  const isAnswered = answeredRegions.has(code);

  let labelColor = '#334155';
  let fontWeight = '500';
  // 줌 레벨에 따라 폰트 크기 조정 (줌이 커질수록 폰트 크기 비율을 줄임) + 사용자 설정 배율 적용
  const baseSize = 4 * fontScale;
  let fontSizeNum = baseSize / Math.max(1, zoom * 0.8); 
  
  // 정답 지역 라벨은 위 로직에서 숨겼으므로, 오답 라벨만 스타일 적용
  if (isWrongFeedback) { 
    labelColor = '#ffffff'; 
    fontWeight = '700'; 
    fontSizeNum = (5 * fontScale) / Math.max(1, zoom * 0.8);
  }
  else if (isAnswered) { 
    labelColor = '#166534'; 
    fontWeight = '600'; 
  } 

  const fontSize = `${fontSizeNum}px`; 

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Marker coordinates={centroid as any}>
      <text
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fontFamily: 'system-ui',
          fontSize,
          fontWeight,
          fill: labelColor,
          pointerEvents: 'none',
          userSelect: 'none',
          textShadow: isAnswered ? '0px 0px 2px rgba(255,255,255,0.8)' : 'none'
        }}
      >
        {name}
      </text>
    </Marker>
  );
});

RegionLabel.displayName = 'RegionLabel';
