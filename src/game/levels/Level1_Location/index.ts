import type { LevelStrategy, LevelContext, GameQuestion, UserInput, ValidationResult } from '../../core/types';
import { generateLevel1Question } from './generator';
import { validateLevel1Answer } from './validator';

export const Level1Strategy: LevelStrategy = {
  config: {
    id: 1,
    name: "1단계: 위치 익히기",
    description: "제시된 지역명을 보고 지도에서 정확한 위치를 찾으세요."
  },

  generateQuestion: (ctx: LevelContext) => {
    return generateLevel1Question(ctx);
  },

  validateAnswer: (question: GameQuestion, input: UserInput) => {
    if (question.type !== 'LOCATE_SINGLE') {
      throw new Error('Level 1 strategy received invalid question type');
    }
    return validateLevel1Answer(question, input);
  },

  renderInstruction: (question: GameQuestion) => {
    if (question.type !== 'LOCATE_SINGLE') return null;
    return question.target.name; // 심플하게 지역명만 반환 (QuizPanel에서 꾸밈)
  },

  renderMapOverlay: () => {
    return null; // 1단계는 별도 오버레이 없음 (기본 RegionLabel 사용)
  }
};
