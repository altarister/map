import type { LocateSingleQuestion, UserInput, ValidationResult } from '../../core/types';

/**
 * Stage 1 (위치 찾기) 정답 검증 함수
 * 
 * @param question - 출제된 문제
 * @param input - 사용자 입력 (MAP_CLICK)
 * @returns ValidationResult - status와 feedback 포함
 */
export const validateStage1Answer = (question: LocateSingleQuestion, input: UserInput): ValidationResult => {
  // MAP_CLICK이 아닌 입력은 오답 처리
  if (input.type !== 'MAP_CLICK') {
    return {
      status: 'WRONG',
      feedback: { isCorrect: false, regionName: '', regionCode: '', correctCode: question.target.code }
    };
  }

  const isCorrect = input.regionCode === question.target.code ||
    input.regionCode.startsWith(question.target.code);

  console.log('[DEBUG-Validation]', {
    inputCode: input.regionCode,
    targetCode: question.target.code,
    targetName: question.target.name,
    isCorrect
  });

  // ✅ BUG-002 관련: 정답/오답 모두 feedback 객체 반환
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
