import type { RegionFeature } from '../../../types/geo';
import type { GameQuestion, LocateSingleQuestion, LevelContext } from '../../core/types';

export const generateLevel1Question = (context: LevelContext): LocateSingleQuestion => {
  const { mapData, difficulty } = context;
  
  // 랜덤 지역 선택
  const randomIndex = Math.floor(Math.random() * mapData.length);
  const targetFeature = mapData[randomIndex];
  
  return {
    id: crypto.randomUUID(),
    type: 'LOCATE_SINGLE',
    target: {
      code: targetFeature.properties.code,
      name: targetFeature.properties.name
    }
  };
};
