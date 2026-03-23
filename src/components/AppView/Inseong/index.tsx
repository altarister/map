import { useState, useEffect } from 'react';
import { useGame } from '../../../contexts/GameContext';
import { InseongDispatchBoard } from './InseongDispatchBoard';
import { InseongSetupScreen } from './InseongSetupScreen';
import { InseongCallDetailScreen } from './InseongCallDetailScreen';
import type { CallItem, UserInput } from '../../../game/core/types';

export const InseongApp = () => {
  const { gameState, lastFeedback, setLastFeedback, checkAnswer } = useGame();
  
  // 확정(배차 완료)된 콜 목록 및 탭 상태 (InseongApp 전역 관리)
  const [confirmedCalls, setConfirmedCalls] = useState<CallItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'CONFIRMED'>('ALL'); // '전체오더' vs '내 장부'
  
  // 클릭해서 상세보기로 진입한 콜 (아직 수락/채점 전)
  const [selectedCall, setSelectedCall] = useState<CallItem | null>(null);

  // 진행 상태가 바뀌면 모달 닫기
  useEffect(() => {
    if (gameState !== 'PLAYING') {
      setSelectedCall(null);
      if (setLastFeedback) setLastFeedback(null);
    }
  }, [gameState, setLastFeedback]);

  // 상세 보기 모달 닫기
  const handleCloseDetail = () => {
    setSelectedCall(null);
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
      <InseongDispatchBoard 
        confirmedCalls={confirmedCalls} 
        activeTab={activeTab} 
        onTabSelect={setActiveTab} 
        onRowClick={(call: CallItem) => setSelectedCall(call)}
      />
    );
  }

  // 필터 설정 단계에서는 설정 화면 뷰 노출
  if (gameState === 'SET_DESTINATION') {
    return <InseongSetupScreen />;
  }

  // 그 외 에러/대기 상태 보호
  return null;
};
