import { useEffect, useRef } from 'react';
import type { CallItem } from '../game/core/types';
import { generateSingleCall } from '../game/stages/Stage2_Route/generator';
import { 
  INITIAL_CALL_COUNT, PROB_CORRECT_ANSWER, MIN_CALL_DELAY_MS, MAX_CALL_DELAY_MS 
} from '../game/stages/Stage2_Route/constants';

interface UseDispatchStreamingProps {
  gameState: string;
  currentStage: number;
  isSettingsOpen: boolean;
  isTimerPaused: boolean;
  fullMapData: any;
  currentLocation: { code: string; name: string } | null;
  targetDestination: { code: string; name: string } | null;
  maxPickupDistanceKm: number;
  minFare: number;
  appendCall: (call: CallItem) => void;
  setIsFetchingOrder: (fetching: boolean) => void;
}

export const useDispatchStreaming = ({
  gameState,
  currentStage,
  isSettingsOpen,
  isTimerPaused,
  fullMapData,
  currentLocation,
  targetDestination,
  maxPickupDistanceKm,
  minFare,
  appendCall,
  setIsFetchingOrder
}: UseDispatchStreamingProps) => {

  const configRef = useRef({
    fullMapData,
    currentLocation,
    targetDestination,
    maxPickupDistanceKm,
    minFare,
    appendCall,
    setIsFetchingOrder
  });

  // 어떤 스테이지의 초기 콜을 배포했는지 기억 (React Strict Mode 완벽 방어)
  const seededStageRef = useRef<number | null>(null);

  // 렌더링될 때마다 최신 설정 덮어쓰기 (useEffect 안 써도 무방하나 관행적으로 동기화)
  useEffect(() => {
    configRef.current = {
      fullMapData,
      currentLocation,
      targetDestination,
      maxPickupDistanceKm,
      minFare,
      appendCall,
      setIsFetchingOrder
    };
  }, [fullMapData, currentLocation, targetDestination, maxPickupDistanceKm, minFare, appendCall, setIsFetchingOrder]);

  useEffect(() => {
    if (gameState === 'PLAYING' && currentStage === 2 && !isSettingsOpen && !isTimerPaused) {
      /*
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let isScheduling = true;

      const scheduleNextCall = () => {
        if (!isScheduling) return;
        
        const nextDelay = Math.random() * (MAX_CALL_DELAY_MS - MIN_CALL_DELAY_MS) + MIN_CALL_DELAY_MS;

        timeoutId = setTimeout(() => {
          const cfg = configRef.current;

          // 방어코드
          if (cfg.fullMapData && cfg.fullMapData.length > 0) {
            const newCall = generateSingleCall(
              {
                mapData: cfg.fullMapData,
                currentLocCode: cfg.currentLocation?.code,
                maxPickupDistanceKm: cfg.maxPickupDistanceKm,
                minFare: cfg.minFare,
                difficulty: 'NORMAL'
              },
              cfg.targetDestination?.code || 'ALL',
              undefined,
              PROB_CORRECT_ANSWER
            );

            cfg.appendCall(newCall);
          }
          
          // 재귀적 다음 호출 예약
          scheduleNextCall();
        }, nextDelay);
      };
      */

      // 5초마다 1개씩 추가되도록 변경 (랜덤 로직 대신 고정 시간 간격)
      let innerTimeoutId: ReturnType<typeof setTimeout> | null = null;
      const intervalId = setInterval(() => {
        const cfg = configRef.current;
        
        // 추가하기 0.5초 전에 '조회 중...' 표시
        cfg.setIsFetchingOrder(true);
        
        innerTimeoutId = setTimeout(() => {
          if (cfg.fullMapData && cfg.fullMapData.length > 0) {
            const newCall = generateSingleCall(
              {
                mapData: cfg.fullMapData,
                currentLocCode: cfg.currentLocation?.code,
                maxPickupDistanceKm: cfg.maxPickupDistanceKm,
                minFare: cfg.minFare,
                difficulty: 'NORMAL'
              },
              cfg.targetDestination?.code || 'ALL',
              undefined,
              PROB_CORRECT_ANSWER
            );
            cfg.appendCall(newCall);
          }
          // 추가 완료 후 표시 제거
          cfg.setIsFetchingOrder(false);
        }, 500);
      }, 5000);

      // 초기 진입 시 즉시 4개의 콜을 생성 (유일한 콜 생성 소스)
      // Strict Mode에서 컴포넌트 마운트가 2번 일어나도 seededStageRef 값이 유지되므로 중복 완벽 방어
      if (seededStageRef.current !== currentStage) {
        const cfg = configRef.current;
        if (cfg.fullMapData && cfg.fullMapData.length > 0) {
          for (let i = 0; i < INITIAL_CALL_COUNT; i++) {
            const call = generateSingleCall(
              { mapData: cfg.fullMapData, currentLocCode: cfg.currentLocation?.code, maxPickupDistanceKm: cfg.maxPickupDistanceKm, minFare: cfg.minFare, difficulty: 'NORMAL' },
              cfg.targetDestination?.code || 'ALL', undefined, PROB_CORRECT_ANSWER
            );
            cfg.appendCall(call);
          }
          seededStageRef.current = currentStage;
        }
      }

      // 첫 스트리밍 사이클 즉시 시작
      // scheduleNextCall();

      // 클린업 함수: 인터벌 + 내부 타이머 모두 정리
      return () => {
        clearInterval(intervalId);
        if (innerTimeoutId) clearTimeout(innerTimeoutId);
        // 조회 중 상태도 초기화
        configRef.current.setIsFetchingOrder(false);
      };
    }
    // 의존성 배열에서 설정값 관련 프롭스 모두 제거. (설정값이 바뀌어도 타이머 리셋 안됨)
  }, [gameState, currentStage, isSettingsOpen, isTimerPaused]);
};
