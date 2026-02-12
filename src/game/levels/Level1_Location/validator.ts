import type { LocateSingleQuestion, UserInput, ValidationResult } from '../../core/types';

export const validateLevel1Answer = (question: LocateSingleQuestion, input: UserInput): ValidationResult => {
  if (input.type !== 'MAP_CLICK') {
    return { 
      status: 'WRONG', 
      feedback: { isCorrect: false, regionName: '', regionCode: '', correctCode: question.target.code } 
    };
  }

  const isCorrect = input.regionCode === question.target.code;

  return {
    status: isCorrect ? 'CORRECT' : 'WRONG',
    feedback: {
      isCorrect,
      regionName: isCorrect ? question.target.name : '', // 오답 시 이름은 상황에 따라 채워짐
      regionCode: input.regionCode,
      correctCode: question.target.code
    }
  };
};
