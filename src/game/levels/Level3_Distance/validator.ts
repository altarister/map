import type { EstimateDistanceQuestion, UserInput, ValidationResult } from '../../core/types';

export const validateLevel3Answer = (
  question: EstimateDistanceQuestion, 
  input: UserInput
): ValidationResult => {
  
  if (input.type !== 'ESTIMATE_VALUE') {
      // 3단계는 지도 클릭이 아니라 수치 입력(또는 슬라이더 등)으로 정답을 제출함
      // 혹은 지도상에서 드래그하여 거리를 만드는 UI일 수도 있음.
      // 일단 'ESTIMATE_VALUE' 입력을 받는다고 가정.
      return { 
        status: 'CONTINUE', // 무시
      };
  }

  const userEst = input.value;
  const actual = question.actualDistance;
  
  // 오차율 계산
  // 예: 실제 100km, 입력 90km -> 오차 10km -> 10% 오차
  const errorRate = Math.abs(userEst - actual) / actual;
  
  // 허용 오차: 난이도에 따라 다를 수 있음. 일단 20% 이내면 정답 처리
  const isCorrect = errorRate <= 0.2; 
  
  return {
    status: isCorrect ? 'CORRECT' : 'WRONG',
    feedback: {
      isCorrect,
      regionCode: '', // 특정 지역 코드가 아님
      correctCode: '',
      regionName: `${actual}km`, // 정답 표시용
      // 추가 정보를 feedback 객체에 넣을 수 있으면 좋음 (예: 오차율, 사용자 입력값)
    }
  };
};
