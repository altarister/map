import { useState, useEffect } from 'react';
import { useGame } from '../../../contexts/GameContext';
import { InseongDispatchBoard } from './InseongDispatchBoard';
import { InseongSetupScreen } from './InseongSetupScreen';
import { InseongCallDetailScreen } from './InseongCallDetailScreen';
import { InseongOngoingDetailScreen } from './InseongOngoingDetailScreen';
import type { CallItem, UserInput } from '../../../game/core/types';
import { generateSingleCall } from '../../../game/stages/Stage2_Route/generator';

export const InseongApp = () => {
  const { 
    gameState, lastFeedback, setLastFeedback, checkAnswer, setSelectedCallId, 
    appendCall, fullMapData, currentLocation, targetDestination, maxPickupDistanceKm, minFare, currentStage 
  } = useGame();
  
  // 확정(배차 완료)된 콜 목록 및 탭 상태 (InseongApp 전역 관리)
  const [confirmedCalls, setConfirmedCalls] = useState<CallItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'CONFIRMED'>('ALL'); // '전체오더' vs '내 장부'
  
  // 클릭해서 상세보기로 진입한 콜 (아직 수락/채점 전)
  const [selectedCall, setSelectedCall] = useState<CallItem | null>(null);

  // 설정 모달 열림 여부
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 배차 타이머(콜 스트리밍) 일시정지 (잠금) 여부
  const [isTimerPaused, setIsTimerPaused] = useState(false);

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

  // 실시간 랜덤 배차 스트리밍 타이머 (5개 / 50초 윈도우)
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
            if (!fullMapData || fullMapData.length === 0) return;
            
            const newCall = generateSingleCall(
              {
                mapData: fullMapData,
                currentLocCode: currentLocation?.code,
                maxPickupDistanceKm,
                minFare,
                difficulty: 'NORMAL'
              },
              targetDestination?.code || 'ALL',
              undefined,
              0.2 // 정답 배차 20% 확률
            );
            
            appendCall(newCall);
          }, delay);
          timeoutIds.push(tid);
        });
      };

      // 첫 번째 사이클 즉시 실행
      scheduleCalls();

      // 이후 50초마다 사이클 반복
      cycleInterval = setInterval(() => {
        timeoutIds.forEach(clearTimeout);
        timeoutIds = [];
        scheduleCalls();
      }, CYCLE_DURATION_MS);

      return () => {
        clearInterval(cycleInterval);
        timeoutIds.forEach(clearTimeout);
      };
    }
  }, [gameState, currentStage, isSettingsOpen, isTimerPaused, fullMapData, currentLocation, targetDestination, maxPickupDistanceKm, minFare, appendCall]);

  // 상세 보기 모달 닫기
  const handleCloseDetail = () => {
    setSelectedCall(null);
    if (setSelectedCallId) setSelectedCallId(null);
    if (setLastFeedback) setLastFeedback(null);
  };

  // 상세 페이지에서 "탁송" (배차 수락) 버튼을 눌렀을 때 => 채점(checkAnswer) 진입
  const handleAcceptCall = (call: CallItem) => {
    const input: UserInput = { type: 'OPTION_SELECT', value: call.id };
    checkAnswer(input);
  };

  // 채점 완료 후 "확정" 을 눌렀을 때 => 내 장부로 이동
  const handleConfirmCall = (call: CallItem) => {
    setConfirmedCalls(prev => {
      if (prev.find(c => c.id === call.id)) return prev;
      return [...prev, call];
    });
    handleCloseDetail();
    setActiveTab('CONFIRMED');
  };

  // 배송 완료 처리 (내 장부에서 제거)
  const handleCompleteDelivery = (call: CallItem) => {
    setConfirmedCalls(prev => prev.filter(c => c.id !== call.id));
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
          onConfirm={handleConfirmCall} 
        />
      );
    }

    // 모달이 꺼져 있으면 배차 보드 리스트 출력
    return (
      <div className="relative w-full h-full">
        <InseongDispatchBoard 
          confirmedCalls={confirmedCalls} 
          activeTab={activeTab} 
          onTabSelect={setActiveTab} 
          onRowClick={(call: CallItem) => {
            setSelectedCall(call);
            if (setSelectedCallId) setSelectedCallId(call.id);
          }}
          onSettingsClick={() => setIsSettingsOpen(true)}
          isTimerPaused={isTimerPaused}
          onToggleTimer={() => setIsTimerPaused(prev => !prev)}
        />
        
        {/* 자동배차 설정 모달 (기존 SetupScreen 재활용) */}
        {isSettingsOpen && (
          <InseongSetupScreen onClose={() => setIsSettingsOpen(false)} />
        )}
      </div>
    );
  }

  // 그 외 에러/대기 상태 보호
  return null;
};
