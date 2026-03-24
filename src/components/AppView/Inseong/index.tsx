import { useState, useEffect } from 'react';
import { useGame } from '../../../contexts/GameContext';
import { InseongDispatchBoard } from './InseongDispatchBoard';
import { InseongSetupScreen } from './InseongSetupScreen';
import { InseongCallDetailScreen } from './InseongCallDetailScreen';
import type { CallItem, UserInput } from '../../../game/core/types';

export const InseongApp = () => {
  const { gameState, lastFeedback, setLastFeedback, checkAnswer, setSelectedCallId } = useGame();
  
  // 확정(배차 완료)된 콜 목록 및 탭 상태 (InseongApp 전역 관리)
  const [confirmedCalls, setConfirmedCalls] = useState<CallItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'CONFIRMED'>('ALL'); // '전체오더' vs '내 장부'
  
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

  // 플레이 중일 때
  if (gameState === 'PLAYING') {
    // 1. 채점이 완료되어 피드백이 내려왔거나 (수락 후 결과 화면)
    // 2. 콜을 선택해서 상세보기 모드인지 검사 (수락 전 상세 화면)
    const displayCall = lastFeedback?.callData || selectedCall;

    if (displayCall) {
      return (
        <InseongCallDetailScreen 
          call={displayCall}
          feedback={lastFeedback}
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
