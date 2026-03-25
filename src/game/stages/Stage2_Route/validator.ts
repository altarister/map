import type { UserInput, ValidationResult, CallFilterQuestion } from '../../core/types';

export const validateStage2Answer = (_question: CallFilterQuestion, input: UserInput): ValidationResult => {
  // 2단계에서는 유저가 선택한 콜 카드의 전체 객체가 input으로 들어옴
  if (input.type === 'CALL_ACCEPT') {
    const selectedCall = input.call;

    if (!selectedCall) {
      return { status: 'CONTINUE' };
    }

    if (!selectedCall.violation) {
      return {
        status: 'CORRECT',
        feedback: {
          regionCode: selectedCall.targetRegion.code,
          correctCode: selectedCall.targetRegion.code, // 정답 지역
          isCorrect: true,
          message: '콜을 성공적으로 수락했습니다.',
          callData: selectedCall
        }
      };
    } else {
      let msg = '조건에 맞지 않는 오더입니다.';
      if (selectedCall.violation === 'BAD_FARE') msg = '똥콜입니다! 요금이 하한선보다 낮습니다.';
      if (selectedCall.violation === 'WRONG_DEST') msg = '도착지가 희망 노선 방향이 아닙니다!';

      return {
        status: 'WRONG',
        feedback: {
          regionCode: selectedCall.targetRegion.code,
          correctCode: '',
          isCorrect: false,
          message: msg,
          callData: selectedCall
        }
      };
    }
  }

  // 기존 호환용 방어코드 유지
  if (input.type === 'OPTION_SELECT') {
    // ...
  }

  // 맵 클릭 등 잘못된 입력은 무시
  return { status: 'CONTINUE' };
};
