import { useMemo } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useDispatchContext } from '../../contexts/DispatchContext';
import { useMapAutoZoom } from '../../hooks/useMapAutoZoom';

export const MapZoomDispatcher = ({
  width, height, zoomTo, mapData, pathGenerator, cityData, level1Data, selectedChapter
}: any) => {
  const { gameState, currentStage, currentQuestion, selectionLevel, currentFocusCode } = useGame();
  const { selectedCallId, isGpsOn, confirmedCalls, streamingCalls, activeTab, routeResult } = useDispatchContext();

  // streamingCalls 전체 배열 대신 최상단 콜 ID만 의존성에 넣어
  // 1초마다 배열이 바뀌더라도 첫 번째 콜이 그대로면 오토줌 재계산을 차단
  const topCallId = streamingCalls.length > 0 ? streamingCalls[0].id : null;

  const focusRegionCodes = useMemo(() => {
    // 6. 정산완료 페이지 (RESULT)
    if (gameState === 'RESULT') {
      if (routeResult?.orderedPoints) {
         return routeResult.orderedPoints.map(p => p.code);
      }
      return undefined;
    }

    if (gameState === 'PLAYING' && currentStage === 2 && currentQuestion?.type === 'CALL_FILTER') {
      const driverCode = currentQuestion.driverLocation?.code;

      // 4 & 5. 완료탭 (CONFIRMED)
      if (activeTab === 'CONFIRMED') {
        if (selectedCallId) {
          // 5. 완료탭 + 상세페이지
          const call = confirmedCalls.find(c => c.id === selectedCallId);
          if (call) {
            return [
              ...(driverCode ? [driverCode] : []),
              ...call.pickups.map(p => p.code),
              ...call.dropoffs.map(d => d.code)
            ];
          }
        }
        
        // 4. 완료탭 (목록 진입 시) -> 전체 확정콜 통합 경로
        if (routeResult?.orderedPoints) {
           return routeResult.orderedPoints.map(p => p.code);
        }
        
        const confirmedCodes = confirmedCalls.flatMap(c => [...c.pickups.map(p => p.code), ...c.dropoffs.map(d => d.code)]);
        return [
           ...(driverCode ? [driverCode] : []),
           ...confirmedCodes
        ];
      }

      // 1, 2, 3. 신규탭 (ALL)
      if (activeTab === 'ALL') {
        if (selectedCallId) {
          // 3. 신규탭 -> 상세페이지
          const call = streamingCalls.find(c => c.id === selectedCallId) || confirmedCalls.find(c => c.id === selectedCallId);
          if (call) {
            return [
              ...(driverCode ? [driverCode] : []),
              ...call.pickups.map(p => p.code),
              ...call.dropoffs.map(d => d.code)
            ];
          }
        }

        if (isGpsOn && streamingCalls.length > 0) {
          // 1. 신규탭 + GPS ON : 최상단 콜 1개
          // 특별 지시: 도척면 -> 조리읍 이면 파주시와 광주시 모두를 줌 (5자리 시/군/구 단위 넓게 잡음)
          const topCall = streamingCalls[0];
          const codes = [
            ...(driverCode ? [driverCode] : []),
            ...topCall.pickups.map(p => p.code),
            ...topCall.dropoffs.map(d => d.code)
          ];
          return codes.map(c => `${c.substring(0, 5)}*`);
        }

        // 2. 신규탭 + GPS OFF : 기사 현재 출발 위치 단일 점만
        // 특별 지시: 광주시면 경기도 전체를 잡음 (2자리 시/도 단위 아주 넓게 잡음)
        return driverCode ? [`${driverCode.substring(0, 2)}*`] : [];
      }
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, currentStage, currentQuestion, selectedCallId, isGpsOn, confirmedCalls, topCallId, activeTab, routeResult]);

  useMapAutoZoom({
    gameState,
    selectedChapter,
    width,
    height,
    zoomTo,
    mapData,
    pathGenerator,
    selectionLevel,
    currentFocusCode,
    level1Data,
    cityData,
    focusRegionCodes,
  });

  return null;
};
