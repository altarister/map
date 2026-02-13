import { useCallback } from 'react';
import type { GameState, AnswerFeedback } from '../types/game';

const CITY_COLORS = [
  '#fee2e2', // Red-100
  '#ffedd5', // Orange-100
  '#fef3c7', // Amber-100
  '#ecfccb', // Lime-100
  '#d1fae5', // Emerald-100
  '#cffafe', // Cyan-100
  '#e0f2fe', // Sky-100
  '#dbeafe', // Blue-100
  '#e0e7ff', // Indigo-100
  '#fae8ff', // Fuchsia-100
  '#fce7f3', // Pink-100
  '#ffe4e6', // Rose-100
];

const CITY_HOVER_COLORS = [
  '#fca5a5', // Red-300
  '#fdba74', // Orange-300
  '#fcd34d', // Amber-300
  '#bef264', // Lime-300
  '#6ee7b7', // Emerald-300
  '#67e8f9', // Cyan-300
  '#7dd3fc', // Sky-300
  '#93c5fd', // Blue-300
  '#a5b4fc', // Indigo-300
  '#e879f9', // Fuchsia-300
  '#f9a8d4', // Pink-300
  '#fda4af', // Rose-300
];

interface UseMapStylesProps {
  lastFeedback: AnswerFeedback | null;
  answeredRegions: Set<string>;
}

export const useMapStyles = ({ lastFeedback, answeredRegions }: UseMapStylesProps) => {
  const getFillColor = useCallback((code: string, isHovered: boolean = false) => {
    // 1. 피드백 상태 (정답/오답 확인 중) - Hover보다 우선순위 높음
    if (lastFeedback) {
      if (lastFeedback.isCorrect && lastFeedback.regionCode === code) return '#22c55e'; // 정답: 초록
      if (!lastFeedback.isCorrect) {
        if (lastFeedback.regionCode === code) return '#ef4444'; // 내가 찍은 오답: 빨강
        if (lastFeedback.correctCode === code) return '#3b82f6'; // 실제 정답: 파랑
      }
    }

    // 2. Hover 상태 (피드백 중이 아닐 때)
    if (isHovered && !lastFeedback) {
        const cityCode = code.substring(0, 4);
        const colorIndex = parseInt(cityCode, 10) % CITY_COLORS.length;
        return CITY_HOVER_COLORS[colorIndex];
    }

    // 3. 이미 맞춘 지역
    if (answeredRegions.has(code)) return '#86efac'; // 정답 맞춤: 연한 초록

    // 4. 기본 지역 색상 (시/군 구분에 따른 색상)
    // 코드가 5자리(시/군/구)면 앞 4자리로 그룹화 (기존 로직 유지)
    // 코드가 7자리 이상(읍/면/동)이면 개별 코드로 색상 구분 (LOD 상세 보기 시 구분되도록)
    const colorCode = code.length > 5 ? code : code.substring(0, 4);
    
    // 문자열 코드를 숫자로 해싱하여 안정적인 인덱스 생성
    let hash = 0;
    for (let i = 0; i < colorCode.length; i++) {
      hash = colorCode.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % CITY_COLORS.length;
    
    return CITY_COLORS[colorIndex];
  }, [lastFeedback, answeredRegions]);

  const getStrokeColor = useCallback((code: string, isHovered: boolean = false) => {
    // 1. Hover 상태
    if (isHovered) return '#4f46e5'; // Indigo-600

    // 2. 피드백 상태
    if (lastFeedback) {
      if (lastFeedback.isCorrect && lastFeedback.regionCode === code) return '#15803d';
      if (!lastFeedback.isCorrect) {
        if (lastFeedback.regionCode === code) return '#b91c1c';
        if (lastFeedback.correctCode === code) return '#1d4ed8';
      }
    }

    // 3. 이미 맞춘 지역
    if (answeredRegions.has(code)) return '#cbd5e1'; // 정답 테두리 (Slate-300)
    
    // 4. 기본 테두리 색상
    return '#94a3b8'; // Slate-400 (기존 Slate-300보다 진하게)
  }, [lastFeedback, answeredRegions]);

  return { getFillColor, getStrokeColor };
};
