import type { StageStrategy, StageContext, GameQuestion, UserInput, ValidationResult } from '../../core/types';
import { generateStage1Question } from './generator';
import { validateStage1Answer } from './validator';

export const Stage1Strategy: StageStrategy = {
  config: {
    id: 1,
    name: "1단계: 지역 숙달",
    shortDescription: "시/군/구 단위로 하나씩 선택하여 집중적으로 위치를 암기합니다.",
    description: "제시된 지역명을 보고 지도에서 정확한 위치를 찾으세요.",
    badge: "R O O K I E",
    mapOptions: {
      forceShowTownGeometry: true
    }
  },

  generateQuestion: (ctx: StageContext) => {
    return generateStage1Question(ctx);
  },

  validateAnswer: (question: GameQuestion, input: UserInput) => {
    if (question.type !== 'LOCATE_SINGLE') {
      throw new Error('Stage 1 strategy received invalid question type');
    }
    return validateStage1Answer(question, input);
  },

  renderInstruction: (question: GameQuestion) => {
    if (question.type !== 'LOCATE_SINGLE') return null;
    return question.target.name;
  },

  renderMapOverlay: () => {
    return null; // 1단계는 별도 오버레이 없음 (기본 RegionLabel 사용)
  }
};
