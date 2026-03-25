import { useMemo } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useDispatchContext } from '../../contexts/DispatchContext';
import { useMapAutoZoom } from '../../hooks/useMapAutoZoom';

export const MapZoomDispatcher = ({
  width, height, zoomTo, mapData, pathGenerator, cityData, level1Data, selectedChapter
}: any) => {
  const { gameState, currentStage, currentQuestion, selectionLevel, currentFocusCode } = useGame();
  const { selectedCallId, isGpsOn, confirmedCalls, streamingCalls } = useDispatchContext();

  // streamingCalls 전체 배열 대신 최상단 콜 ID만 의존성에 넣어
  // 1초마다 배열이 바뀌더라도 첫 번째 콜이 그대로면 오토줌 재계산을 차단
  const topCallId = streamingCalls.length > 0 ? streamingCalls[0].id : null;

  const focusRegionCodes = useMemo(() => {
    if (gameState === 'PLAYING' && currentStage === 2 && currentQuestion?.type === 'CALL_FILTER') {
      const confirmedCodes = confirmedCalls.flatMap(c => [...c.pickups.map(p => p.code), ...c.dropoffs.map(d => d.code)]);

      if (selectedCallId) {
        const call = streamingCalls.find(c => c.id === selectedCallId) || confirmedCalls.find(c => c.id === selectedCallId);
        if (call && currentQuestion.driverLocation) {
          return [currentQuestion.driverLocation.code, ...call.pickups.map(p => p.code), ...call.dropoffs.map(d => d.code), ...confirmedCodes];
        }
      }
      
      if (isGpsOn && streamingCalls.length > 0) {
        const topCall = streamingCalls[0];
        return [
          ...(currentQuestion.driverLocation ? [currentQuestion.driverLocation.code] : []),
          ...topCall.pickups.map(p => p.code),
          ...topCall.dropoffs.map(d => d.code),
          ...confirmedCodes
        ];
      }

      return [
        ...(currentQuestion.driverLocation ? [currentQuestion.driverLocation.code] : []),
        ...confirmedCodes
      ];
    }
    return undefined;
    // NOTE: streamingCalls 전체 대신 topCallId만 넣어 새 콜이 최상단으로 올 때만 재계산
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, currentStage, currentQuestion, selectedCallId, isGpsOn, confirmedCalls, topCallId]);

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
