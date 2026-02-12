import type { LevelContext, LocatePairQuestion } from '../../core/types';

export const generateLevel2Question = (context: LevelContext): LocatePairQuestion => {
  const { mapData } = context;
  
  // 랜덤 상차지 선택
  const startIndex = Math.floor(Math.random() * mapData.length);
  const startFeature = mapData[startIndex];

  // 랜덤 하차지 선택 (상차지와 다른 곳)
  let endIndex = Math.floor(Math.random() * mapData.length);
  while (endIndex === startIndex) {
    endIndex = Math.floor(Math.random() * mapData.length);
  }
  const endFeature = mapData[endIndex];
  
  return {
    id: crypto.randomUUID(),
    type: 'LOCATE_PAIR',
    start: {
      code: startFeature.properties.code,
      name: startFeature.properties.name
    },
    end: {
      code: endFeature.properties.code,
      name: endFeature.properties.name
    }
  };
};
