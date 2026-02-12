import { useMemo } from 'react';
import type { RegionCollection } from '../types/geo';
import type { AnswerFeedback } from '../types/game';

interface UseMapFeaturesProps {
  mapData: RegionCollection | null;
  hoveredRegion: string | null;
  lastFeedback: AnswerFeedback | null;
  answeredRegions: Set<string>;
}

export const useMapFeatures = ({
  mapData,
  hoveredRegion,
  lastFeedback,
  answeredRegions,
}: UseMapFeaturesProps) => {
  const sortedFeatures = useMemo(() => {
    if (!mapData?.features) return [];

    // 원본 배열 복사 후 정렬
    return [...mapData.features].sort((a, b) => {
      const codeA = a.properties?.code || '';
      const codeB = b.properties?.code || '';

      const isHoveredA = hoveredRegion === codeA;
      const isHoveredB = hoveredRegion === codeB;

      const isFeedbackA = lastFeedback && (lastFeedback.regionCode === codeA || lastFeedback.correctCode === codeA);
      const isFeedbackB = lastFeedback && (lastFeedback.regionCode === codeB || lastFeedback.correctCode === codeB);

      const isAnsweredA = answeredRegions.has(codeA);
      const isAnsweredB = answeredRegions.has(codeB);

      // 우선순위: Hover > Feedback > Answered > Normal
      if (isHoveredA && !isHoveredB) return 1; // 나중에 그려짐 (위로 올라옴)
      if (!isHoveredA && isHoveredB) return -1;
      
      if (isFeedbackA && !isFeedbackB) return 1;
      if (!isFeedbackA && isFeedbackB) return -1;
      
      if (isAnsweredA && !isAnsweredB) return 1;
      if (!isAnsweredA && isAnsweredB) return -1;

      return 0;
    });
  }, [mapData, hoveredRegion, lastFeedback, answeredRegions]);

  return { features: sortedFeatures };
};
