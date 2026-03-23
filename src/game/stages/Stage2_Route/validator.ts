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

    if (!selectedCall.violation) {
      return {
        status: 'CORRECT',
        feedback: {
          regionCode: selectedCall.targetRegion.code,
          correctCode: selectedCall.targetRegion.code,
          isCorrect: true,
          message: '배차 성공!'
        }
      };
    } else {
      let msg = '조건에 맞지 않는 오더입니다.';
      if (selectedCall.violation === 'BAD_FARE') msg = '똥콜입니다! 요금이 하한선보다 낮습니다.';
      if (selectedCall.violation === 'FAR_PICKUP') msg = '공차 거리가 멉니다! 상차 한도를 초과했습니다.';
      if (selectedCall.violation === 'WRONG_DEST') msg = '도착지가 희망 노선 방향이 아닙니다!';

      return {
        status: 'WRONG',
        feedback: {
          regionCode: selectedCall.targetRegion.code,
          correctCode: '',
          isCorrect: false,
          message: msg
        }
      };
    }
  }

  // 맵 클릭 등 잘못된 입력은 무시
  return { status: 'CONTINUE' };
};
