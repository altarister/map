import type { UserInput, ValidationResult, CallFilterQuestion } from '../../core/types';

export const validateStage2Answer = (question: CallFilterQuestion, input: UserInput): ValidationResult => {
  // 2단계에서는 유저가 선택한 콜 카드의 옵션 값이 input으로 들어옴
  // Option Select로 넘어온 value를 콜 ID로 취급  
  if (input.type === 'OPTION_SELECT') {
    const selectedCallId = input.value as string;
    const selectedCall = question.calls.find(c => c.id === selectedCallId);

    if (!selectedCall) {
      return { status: 'CONTINUE' };
    }

    if (selectedCall.isMatchingRoute) {
      return {
        status: 'CORRECT',
        feedback: {
          regionCode: selectedCall.targetRegion.code,
          correctCode: selectedCall.targetRegion.code, // 정답 지역
          isCorrect: true
        }
      };
    } else {
      return {
        status: 'WRONG',
        feedback: {
          regionCode: selectedCall.targetRegion.code,
          correctCode: '', // 굳이 정답 콜을 하나만 지칭하진 않음
          isCorrect: false
        }
      };
    }
  }

  // 맵 클릭 등 잘못된 입력은 무시
  return { status: 'CONTINUE' };
};
