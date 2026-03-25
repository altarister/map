import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { CallItem } from '../game/core/types';
import { MAX_STREAMING_CALLS } from '../game/stages/Stage2_Route/constants';
import { useGame } from './GameContext';

interface DispatchContextType {
  streamingCalls: CallItem[];
  setStreamingCalls: React.Dispatch<React.SetStateAction<CallItem[]>>;
  confirmedCalls: CallItem[];
  setConfirmedCalls: React.Dispatch<React.SetStateAction<CallItem[]>>;
  selectedCallId: string | null;
  setSelectedCallId: (id: string | null) => void;
  isGpsOn: boolean;
  setIsGpsOn: (on: boolean) => void;
  isTimerPaused: boolean;
  setIsTimerPaused: (paused: boolean) => void;
  activeTab: 'ALL' | 'CONFIRMED';
  setActiveTab: (tab: 'ALL' | 'CONFIRMED') => void;
  appendCall: (call: CallItem) => void;
}

const DispatchContext = createContext<DispatchContextType | undefined>(undefined);

export const DispatchProvider = ({ children }: { children: ReactNode }) => {
  const [streamingCalls, setStreamingCalls] = useState<CallItem[]>([]);
  const [confirmedCalls, setConfirmedCalls] = useState<CallItem[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [isGpsOn, setIsGpsOn] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'CONFIRMED'>('ALL');

  const { currentStage } = useGame();

  // 1/2 단계 스위치 시 초기화
  useEffect(() => {
    setStreamingCalls([]);
    setConfirmedCalls([]);
    setSelectedCallId(null);
    setIsGpsOn(false);
    setIsTimerPaused(false);
    setActiveTab('ALL');
  }, [currentStage]);

  const appendCall = (call: CallItem) => {
    setStreamingCalls(prev => {
      const next = [call, ...prev];
      return next.length > MAX_STREAMING_CALLS ? next.slice(0, MAX_STREAMING_CALLS) : next;
    });
  };

  return (
    <DispatchContext.Provider value={{
      streamingCalls,
      setStreamingCalls,
      confirmedCalls,
      setConfirmedCalls,
      selectedCallId,
      setSelectedCallId,
      isGpsOn,
      setIsGpsOn,
      isTimerPaused,
      setIsTimerPaused,
      activeTab,
      setActiveTab,
      appendCall
    }}>
      {children}
    </DispatchContext.Provider>
  );
};

export const useDispatchContext = () => {
  const ctx = useContext(DispatchContext);
  if (!ctx) throw new Error('useDispatchContext must be used within DispatchProvider');
  return ctx;
};
