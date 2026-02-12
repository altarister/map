import type { LocatePairQuestion, UserInput, ValidationResult } from '../../core/types';

interface Level2State {
  step: 'FIND_START' | 'FIND_END';
}

export const validateLevel2Answer = (
  question: LocatePairQuestion, 
  input: UserInput, 
  state: Level2State | null
): ValidationResult => {
  const currentState: Level2State = state || { step: 'FIND_START' };

  if (input.type !== 'MAP_CLICK') {
    return { 
      status: 'WRONG', 
      feedback: { isCorrect: false, regionCode: '', correctCode: currentState.step === 'FIND_START' ? question.start.code : question.end.code } 
    };
  }

  const { start, end } = question;

  if (currentState.step === 'FIND_START') {
    const isCorrect = input.regionCode === start.code;
    if (isCorrect) {
      return {
        status: 'CONTINUE',
        feedback: {
          isCorrect: true,
          regionCode: input.regionCode,
          correctCode: start.code,
          regionName: start.name
        },
        nextStepInstruction: 'FIND_END' // 다음 단계 지시 (내부 상태 업데이트용 아님, 단순 정보)
      };
    } else {
      return {
        status: 'WRONG',
        feedback: {
          isCorrect: false,
          regionCode: input.regionCode,
          correctCode: start.code,
          regionName: start.name // 오답 피드백에 정답 이름 포함
        }
      };
    }
  } else {
    // FIND_END
    const isCorrect = input.regionCode === end.code;
    if (isCorrect) {
      return {
        status: 'CORRECT',
        feedback: {
          isCorrect: true,
          regionCode: input.regionCode,
          correctCode: end.code,
          regionName: end.name
        }
      };
    } else {
      return {
        status: 'WRONG',
        feedback: {
          isCorrect: false,
          regionCode: input.regionCode,
          correctCode: end.code,
          regionName: end.name
        }
      };
    }
  }
};
