import { useState, useEffect } from 'react';
import { useGame } from '../../../contexts/GameContext';
import { useDispatchContext } from '../../../contexts/DispatchContext';
import { useDispatchStreaming } from '../../../hooks/useDispatchStreaming';
import { InseongDispatchBoard } from './InseongDispatchBoard';
import { InseongSetupScreen } from './InseongSetupScreen';
import { InseongSettingsPopup } from './InseongSettingsPopup';
import { InseongDropdownMenu } from './InseongDropdownMenu';
import { InseongCallDetailScreen } from './InseongCallDetailScreen';
import { InseongOngoingDetailScreen } from './InseongOngoingDetailScreen';
import type { CallItem } from '../../../game/core/types';
import { BATCH_TARGET_COUNT } from '../../../game/stages/Stage2_Route/constants';

export const InseongApp = () => {
  const { 
    gameState, lastFeedback, setLastFeedback, endGame,
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

  type PopupType = 'SETUP' | 'SETTINGS' | 'MENU' | null;
  const [activePopup, setActivePopup] = useState<PopupType>(null);

  // 진행 상태가 바뀌거나 모달을 닫을 때 등 상태 초기화
  useEffect(() => {
    if (gameState !== 'PLAYING') {
      setSelectedCall(null);
      if (setSelectedCallId) setSelectedCallId(null);
      setActivePopup(null); // 타 모드 이동 시 모달 초기화
      if (setLastFeedback) setLastFeedback(null);
    } else {
      // 2단계 최초 배차 시 (로컬 스토리지에 설정값이 없으면) 자동으로 필터 셋업 모달 노출
      const saved = localStorage.getItem('STAGE2_SETTINGS');
      if (!saved) {
        setActivePopup('SETTINGS');
      }
    }
  }, [gameState, setLastFeedback, setSelectedCallId]);

  useDispatchStreaming({
    gameState,
    currentStage,
    isSettingsOpen: activePopup !== null,
    isTimerPaused,
    fullMapData,
    currentLocation,
    targetDestination,
    maxPickupDistanceKm,
    minFare,
    appendCall
  });

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
          onStartClick={() => setActivePopup('SETUP')}
          onSettingsClick={() => setActivePopup('SETTINGS')}
          onMenuClick={() => setActivePopup('MENU')}
          isTimerPaused={isTimerPaused}
          onToggleTimer={() => setIsTimerPaused(!isTimerPaused)}
          batchTarget={BATCH_TARGET_COUNT}
        />
      )}  
        {/* 자동배차 설정 모달 (사제 매크로 UI) */}
        {activePopup === 'SETUP' && (
          <InseongSetupScreen onClose={() => setActivePopup(null)} />
        )}
        {/* 오더 리스트 필터 모달 (공식 맵 설정 UI) */}
        {activePopup === 'SETTINGS' && (
          <InseongSettingsPopup onClose={() => setActivePopup(null)} />
        )}
        {/* 하단 드롭다운 메뉴 레이어 */}
        {activePopup === 'MENU' && (
          <InseongDropdownMenu onClose={() => setActivePopup(null)} />
        )}
      </div>
    );
  }

  // 그 외 상태에서는 빈 화면 처리
  return null;
};
