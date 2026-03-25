import { useState, useEffect } from 'react';
import { useGame } from '../../../contexts/GameContext';
import { useDispatchContext } from '../../../contexts/DispatchContext';
import { useDispatchStreaming } from '../../../hooks/useDispatchStreaming';
import { InseongDispatchBoard } from './InseongDispatchBoard';
import { InseongSetupScreen } from './InseongSetupScreen';
import { InseongCallDetailScreen } from './InseongCallDetailScreen';
import { InseongOngoingDetailScreen } from './InseongOngoingDetailScreen';
import { Stage2ResultModal } from './Stage2ResultModal';
import type { CallItem } from '../../../game/core/types';

export const InseongApp = () => {
  const { 
    gameState, lastFeedback, setLastFeedback, endGame, resetGame, startGame,
    fullMapData, currentLocation, targetDestination, maxPickupDistanceKm, minFare, currentStage 
  } = useGame();

  const {
    confirmedCalls,
    setConfirmedCalls,
    setStreamingCalls,
    setSelectedCallId,
    isTimerPaused,
    setIsTimerPaused,
    activeTab,
    setActiveTab,
    appendCall
  } = useDispatchContext();
  
  // 클릭해서 상세보기로 진입한 콜 (아직 수락/채점 전)
  const [selectedCall, setSelectedCall] = useState<CallItem | null>(null);

  // 설정 모달 열림 여부
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 진행 상태가 바뀌거나 모달을 닫을 때 등 상태 초기화
  useEffect(() => {
    if (gameState !== 'PLAYING') {
      setSelectedCall(null);
      if (setSelectedCallId) setSelectedCallId(null);
      setIsSettingsOpen(false); // 타 모드 이동 시 모달 초기화
      if (setLastFeedback) setLastFeedback(null);
    } else {
      // 2단계 최초 배차 시 (로컬 스토리지에 설정값이 없으면) 자동으로 설정 모달 노출
      const saved = localStorage.getItem('STAGE2_SETTINGS');
      if (!saved) {
        setIsSettingsOpen(true);
      }
    }
  }, [gameState, setLastFeedback, setSelectedCallId]);

  useDispatchStreaming({
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
  });

  const BATCH_TARGET_COUNT = 3; // 합짐 목표 콜 수 (이 값만 바꾸면 전체 반영)

  // ========== [Advanced Routing] 합짐 트리거 ==========
  useEffect(() => {
    if (gameState === 'PLAYING' && currentStage === 2 && confirmedCalls.length >= BATCH_TARGET_COUNT) {
      endGame();
    }
  }, [confirmedCalls.length, gameState, currentStage, endGame]);

  // 상세 보기 모달 닫기
  const handleCloseDetail = () => {
    setSelectedCall(null);
    if (setSelectedCallId) setSelectedCallId(null);
    if (setLastFeedback) setLastFeedback(null);
  };

  // 배차 리스트에서 콜 클릭 시 (상세보기 진입 & 맵 연동)
  const handleCallClick = (call: CallItem) => {
    setSelectedCall(call);
    if (setSelectedCallId) setSelectedCallId(call.id);
  };

  // [Advanced Routing] 상세 페이지에서 "탁송" 버튼을 눌렀을 때
  // → streamingCalls에서 해당 콜 제거 + confirmedCalls에 추가
  // → 상세 닫고 신규(ALL) 탭으로 복귀, 지도는 GPS 상태에 맞추어 리셋
  const handleAcceptCall = (call: CallItem) => {
    // 1. 스트리밍 리스트에서 팝
    setStreamingCalls((prev: CallItem[]) => prev.filter((c: CallItem) => c.id !== call.id));
    // 2. 확정 리스트에 추가 (중복 방지)
    setConfirmedCalls((prev: CallItem[]) => {
      if (prev.find((c: CallItem) => c.id === call.id)) return prev;
      return [...prev, call];
    });
    // 3. 상세 닫기 + 신규 탭 유지 + 지도 리셋(선택 해제)
    handleCloseDetail();
    setSelectedCallId(null);
    setActiveTab('ALL');
  };

  // 배송 완료 처리 (내 장부에서 제거)
  const handleCompleteDelivery = (call: CallItem) => {
    setConfirmedCalls((prev: CallItem[]) => prev.filter((c: CallItem) => c.id !== call.id));
    handleCloseDetail();
  };

  // 플레이 중일 때
  if (gameState === 'PLAYING') {
    // 1. 채점이 완료되어 피드백이 내려왔거나 (수락 후 결과 화면)
    // 2. 콜을 선택해서 상세보기 모드인지 검사 (수락 전 상세 화면)
    const displayCall = lastFeedback?.callData || selectedCall;

    if (displayCall) {
      const isConfirmed = confirmedCalls.some(c => c.id === displayCall.id);

      // 이미 내 장부에 있는 콜이고, 현재 피드백 모드가 아니면 진행중 뷰 렌더링
      if (isConfirmed && !lastFeedback) {
        return (
          <InseongOngoingDetailScreen
            call={displayCall}
            onClose={handleCloseDetail}
            onConfirm={handleCompleteDelivery}
          />
        );
      }

      // 신규 콜 상세 뷰 렌더링 (또는 방금 잡은 콜의 피드백 결과 뷰)
      return (
        <InseongCallDetailScreen 
          call={displayCall}
          feedback={lastFeedback}
          isConfirmed={isConfirmed}
          onClose={handleCloseDetail}
          onAccept={handleAcceptCall}
        />
      );
    }

    // 모달이 꺼져 있으면 배차 보드 리스트 출력
    return (
      <div className="relative w-full h-full">
      {!selectedCall && !lastFeedback && (
        <InseongDispatchBoard 
          confirmedCalls={confirmedCalls}
          activeTab={activeTab}
          onTabSelect={setActiveTab}
          onCallClick={handleCallClick}
          onSettingsClick={() => setIsSettingsOpen(true)}
          isTimerPaused={isTimerPaused}
          onToggleTimer={() => setIsTimerPaused(!isTimerPaused)}
          batchTarget={BATCH_TARGET_COUNT}
        />
      )}  
        {/* 자동배차 설정 모달 (기존 SetupScreen 재활용) */}
        {isSettingsOpen && (
          <InseongSetupScreen onClose={() => setIsSettingsOpen(false)} />
        )}
      </div>
    );
  }

  // 합짐 정산 결과 뷰
  if (gameState === 'RESULT' && currentStage === 2) {
    return (
      <Stage2ResultModal 
        confirmedCalls={confirmedCalls}
        currentLocation={currentLocation}
        fullMapData={fullMapData}
        onRetry={() => {
          setConfirmedCalls([]);
          resetGame();
          startGame({}, true);
        }}
        onExit={() => {
          setConfirmedCalls([]);
          resetGame();
        }}
      />
    );
  }

  // 그 외 에러/대기 상태 보호
  return null;
};
