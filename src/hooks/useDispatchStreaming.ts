import { useEffect, useRef } from 'react';
import type { CallItem } from '../game/core/types';
import { generateSingleCall } from '../game/stages/Stage2_Route/generator';

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
  appendCall
}: UseDispatchStreamingProps) => {

  const configRef = useRef({
    fullMapData,
    currentLocation,
    targetDestination,
    maxPickupDistanceKm,
    minFare,
    appendCall
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
      appendCall
    };
  }, [fullMapData, currentLocation, targetDestination, maxPickupDistanceKm, minFare, appendCall]);

  useEffect(() => {
    if (gameState === 'PLAYING' && currentStage === 2 && !isSettingsOpen && !isTimerPaused) {
      const CALL_BATCH_COUNT = 5;
      const CALL_BASE_INTERVAL_MS = 10000; // 10초 상수
      const CYCLE_DURATION_MS = CALL_BATCH_COUNT * CALL_BASE_INTERVAL_MS;

      let timeoutIds: ReturnType<typeof setTimeout>[] = [];
      let cycleInterval: ReturnType<typeof setInterval>;

      const scheduleCalls = () => {
        // 50초(CYCLE_DURATION_MS) 사이클 내의 랜덤한 5가지 시점 계산
        const delays = Array.from({ length: CALL_BATCH_COUNT }, () => Math.random() * CYCLE_DURATION_MS);

        delays.forEach(delay => {
          const tid = setTimeout(() => {
            const { 
              fullMapData: latestMapData, 
              currentLocation: latestLoc, 
              targetDestination: latestDest, 
              maxPickupDistanceKm: latestDist, 
              minFare: latestFare, 
              appendCall: latestAppend 
            } = configRef.current;

            // 방어코드
            if (!latestMapData || latestMapData.length === 0) return;

            const newCall = generateSingleCall(
              {
                mapData: latestMapData,
                currentLocCode: latestLoc?.code,
                maxPickupDistanceKm: latestDist,
                minFare: latestFare,
                difficulty: 'NORMAL'
              },
              latestDest?.code || 'ALL',
              undefined,
              0.2 // 정답 배차 20% 확률
            );

            latestAppend(newCall);
          }, delay);
          timeoutIds.push(tid);
        });
      };


      // 초기 진입 시 즉시 4개의 콜을 생성 (유일한 콜 생성 소스)
      // Strict Mode에서 컴포넌트 마운트가 2번 일어나도 seededStageRef 값은 유지되므로 중복 생성 완벽 방어
      if (seededStageRef.current !== currentStage) {
        const cfg = configRef.current;
        if (cfg.fullMapData && cfg.fullMapData.length > 0) {
          for (let i = 0; i < 4; i++) {
            const call = generateSingleCall(
              { mapData: cfg.fullMapData, currentLocCode: cfg.currentLocation?.code, maxPickupDistanceKm: cfg.maxPickupDistanceKm, minFare: cfg.minFare, difficulty: 'NORMAL' },
              cfg.targetDestination?.code || 'ALL', undefined, 0.2
            );
            cfg.appendCall(call);
          }
          seededStageRef.current = currentStage;
        }
      }

      // 첫 번째 스트리밍 사이클 즉시 실행 (0~50초 사이 랜덤 딜레이로 5개 점진적 추가)
      scheduleCalls();

      // 이후 50초마다 사이클 반복
      cycleInterval = setInterval(() => {
        timeoutIds.forEach(clearTimeout);
        timeoutIds = [];
        scheduleCalls();
      }, CYCLE_DURATION_MS);

      // 클린업 함수: 타이머를 일시정지(모달 오픈 등)하거나 게임이 끝날 때만 초기화
      return () => {
        clearInterval(cycleInterval);
        timeoutIds.forEach(clearTimeout);
      };
    }
    // 의존성 배열에서 설정값 관련 프롭스 모두 제거. (설정값이 바뀌어도 타이머 리셋 안됨)
  }, [gameState, currentStage, isSettingsOpen, isTimerPaused]);
};
