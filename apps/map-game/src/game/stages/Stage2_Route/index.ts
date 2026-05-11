import type { StageStrategy, GameQuestion, StageContext, UserInput } from '../../core/types';
import { generateCallBatch } from './generator';
import { validateStage2Answer } from './validator';

export const Stage2Strategy: StageStrategy = {
  config: {
    id: 2,
    name: "2단계: 실전 배차",
    shortDescription: "희망 노선 방향의 화물 콜만 빠르게 골라냅니다.",
    description: "본인의 희망 노선과 일치하는 화물 콜을 골라 수락하세요.",
    badge: "E X P E R T",
    mapOptions: {
      forceShowTownGeometry: true
    }
  },

  // Stage 1의 generateQuestion과 달리, 2단계는 유저의 희망 목적지 등 추가 context가 필요함.
  // GameContext 등 외부 상태 의존을 피하기 위해, 이 메서드는 기본 껍데기만 두고
  // 실제 호출부(GameContent 또는 커스텀 훅)에서 직접 generator를 호출하는 방식을 사용할 수도 있음.
  generateQuestion: (ctx: StageContext) => {
    // 2단계: 모달에서 선택한 유저 목적지로 배차 콜 생성
    return generateCallBatch(ctx, ctx.targetDestCode || '41610');
  },

  validateAnswer: (question: GameQuestion, input: UserInput) => {
    if (question.type !== 'CALL_FILTER') {
      throw new Error('Stage 2 strategy received invalid question type');
    }
    return validateStage2Answer(question, input);
  },

  renderInstruction: (question: GameQuestion) => {
    if (question.type !== 'CALL_FILTER') return null;
    return "배차 콜 대기 중..."; // 상단 메시지바
  },

  renderMapOverlay: () => {
    return null; // 2단계 오버레이는 RouteAnimationLayer 등 별도 UI가 처리
  }
};
