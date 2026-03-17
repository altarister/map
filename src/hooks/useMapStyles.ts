import { useCallback } from 'react';
import type { AnswerFeedback } from '../types/game';

// 삭제된 잡다한 색깔 테이블

interface UseMapStylesProps {
  lastFeedback: AnswerFeedback | null;
  answeredRegions: Set<string>;
  isBasicMode?: boolean;
}

export const useMapStyles = ({ lastFeedback, answeredRegions, isBasicMode = false }: UseMapStylesProps) => {
  const getFillColor = useCallback((feature: any, isHovered: boolean = false) => {
    const code = typeof feature === 'string' ? feature : feature?.properties?.code;
    const orderVolume = typeof feature === 'object' ? feature?.properties?.intel?.orderVolume : undefined;

    // 1. 피드백 상태 (정답/오답 확인 중) - Hover보다 우선순위 높음
    if (lastFeedback) {
      if (lastFeedback.isCorrect && lastFeedback.regionCode === code) return '#22c55e'; // 정답: 초록
      if (!lastFeedback.isCorrect) {
        if (lastFeedback.regionCode === code) return '#ef4444'; // 내가 찍은 오답: 빨강
        if (lastFeedback.correctCode === code) return '#3b82f6'; // 실제 정답: 파랑
      }
    }

    // 2. 이미 맞춘 지역
    if (answeredRegions.has(code)) return '#86efac'; // 정답 맞춤: 연한 초록

    // 3. 히트맵(orderVolume) 베이스 + Hover 색상
    if (orderVolume) {
      if (orderVolume === '최상') return isHovered ? 'rgba(4, 120, 87, 0.95)' : 'rgba(5, 150, 105, 0.85)';
      if (orderVolume === '상') return isHovered ? 'rgba(5, 150, 105, 0.85)' : 'rgba(16, 185, 129, 0.7)';
      if (orderVolume === '중상') return isHovered ? 'rgba(16, 185, 129, 0.7)' : 'rgba(52, 211, 153, 0.55)';
      if (orderVolume === '중') return isHovered ? 'rgba(52, 211, 153, 0.6)' : 'rgba(110, 231, 183, 0.4)';
      if (orderVolume === '중하') return isHovered ? 'rgba(110, 231, 183, 0.5)' : 'rgba(167, 243, 208, 0.25)';
      if (orderVolume === '하') return isHovered ? 'rgba(167, 243, 208, 0.3)' : 'rgba(209, 250, 229, 0.1)';
    }

    // 기본 색상
    return isHovered ? 'rgba(71, 85, 105, 0.6)' : 'rgba(30, 41, 59, 0.4)';
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
    // BASIC 모드에서는 내부 '리' 구획선들이 자연스럽게 합쳐져 보이도록 테두리를 아주 연하게 눈속임 처리
    return isBasicMode ? 'rgba(148, 163, 184, 0.15)' : '#94a3b8'; // Slate-400 (기존 Slate-300보다 진하게)
  }, [lastFeedback, answeredRegions]);

  return { getFillColor, getStrokeColor };
};
