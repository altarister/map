import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { CallItem } from '../game/core/types';
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
  appendCall: (call: CallItem) => void;
}

const DispatchContext = createContext<DispatchContextType | undefined>(undefined);

export const DispatchProvider = ({ children }: { children: ReactNode }) => {
  const [streamingCalls, setStreamingCalls] = useState<CallItem[]>([]);
  const [confirmedCalls, setConfirmedCalls] = useState<CallItem[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [isGpsOn, setIsGpsOn] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  const { currentStage } = useGame();

  // 1/2 단계 스위치 시 초기화
  useEffect(() => {
    setStreamingCalls([]);
    setConfirmedCalls([]);
    setSelectedCallId(null);
    setIsGpsOn(false);
    setIsTimerPaused(false);
  }, [currentStage]);

  const MAX_STREAMING_CALLS = 50;
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
