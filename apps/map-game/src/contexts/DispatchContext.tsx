import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { CallItem } from '../game/core/types';
import { MAX_STREAMING_CALLS } from '../game/stages/Stage2_Route/constants';
import { useGame } from './GameContext';
import { RouteOptimizer, type RouteOptimizationResult } from '../game/stages/Stage2_Route/optimizer';
import { fetchRealWorldRoute, type RouteGeometry } from '../utils/osrm';

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
  isFetchingOrder: boolean;
  setIsFetchingOrder: (fetching: boolean) => void;
  // OSRM 분석 결과 캐싱 (중복 API 통신 방지용)
  routeResult: RouteOptimizationResult | null;
  calculateRouteResult: (driverLocation: { code: string; name: string; centroid: [number, number] }) => void;
  // 선택된 단일 콜의 OSRM 주행 궤적 캐시
  selectedCallRoute: RouteGeometry | null;
}

const DispatchContext = createContext<DispatchContextType | undefined>(undefined);

export const DispatchProvider = ({ children }: { children: ReactNode }) => {
  const [streamingCalls, setStreamingCalls] = useState<CallItem[]>([]);
  const [confirmedCalls, setConfirmedCalls] = useState<CallItem[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [isGpsOn, setIsGpsOn] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'CONFIRMED'>('ALL');
  const [isFetchingOrder, setIsFetchingOrder] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteOptimizationResult | null>(null);
  const [selectedCallRoute, setSelectedCallRoute] = useState<RouteGeometry | null>(null);
  
  const isFetchingRoute = useRef(false);
  const lastProcessedCallIds = useRef<string>('');

  // useGame에서 위치 및 질문(운전자 위치), 진행상태 끌어옴
  const { currentStage, currentLocation, currentQuestion, gameState } = useGame();

  // 1/2 단계 스위치 시 초기화
  useEffect(() => {
    setStreamingCalls([]);
    setConfirmedCalls([]);
    setSelectedCallId(null);
    setIsGpsOn(false);
    setIsTimerPaused(false);
    setActiveTab('ALL');
    setRouteResult(null); // 단계 변경 시결과 초기화
    setSelectedCallRoute(null);
    isFetchingRoute.current = false;
    lastProcessedCallIds.current = '';
  }, [currentStage]);

  // 선택된 콜이 바뀔 때 마다 단일 OSRM 경로 패치 (상세화면은 GPS ON/OFF 무관하게 무조건 호출)
  useEffect(() => {
    if (!selectedCallId || !currentLocation) {
      setSelectedCallRoute(null);
      return;
    }

    const call = streamingCalls.find(c => c.id === selectedCallId) || confirmedCalls.find(c => c.id === selectedCallId);
    if (!call) {
      setSelectedCallRoute(null);
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        // currentQuestion에서 운전자 좌표값을 즉시 확보 (fullMapData를 뒤지지 않음)
        const callFilter = currentQuestion as any;
        const driverCentroid = callFilter?.driverLocation?.centroid;
        
        if (!driverCentroid) return;

        const waypoints = [
          { code: currentLocation.code, name: currentLocation.name, fullName: currentLocation.name, centroid: driverCentroid },
          ...call.pickups,
          ...call.dropoffs
        ];
        // 캐시를 구현하지 않고 매번 부르지만, isGpsOn=true일 땐 부르지 않도록 방어
        const route = await fetchRealWorldRoute(waypoints);
        if (isMounted) {
          setSelectedCallRoute(route);
        }
      } catch (err) {
        console.warn('Failed to fetch selected call route:', err);
      }
    })();

    return () => { isMounted = false; };
  }, [selectedCallId, currentLocation, currentQuestion]);

  const appendCall = (call: CallItem) => {
    setStreamingCalls(prev => {
      const next = [call, ...prev];
      return next.length > MAX_STREAMING_CALLS ? next.slice(0, MAX_STREAMING_CALLS) : next;
    });
  };

  // 완료 탭 진입 또는 정산 모드 진입 시에만 최적화 경로(routeResult)를 갱신 (불필요한 OSRM 호출 방지)
  useEffect(() => {
    if (activeTab !== 'CONFIRMED' && gameState !== 'RESULT') return;

    const currentIds = confirmedCalls.map(c => c.id).sort().join(',');
    if (confirmedCalls.length === 0) {
      setRouteResult(null);
      lastProcessedCallIds.current = '';
      return;
    }
    
    if (lastProcessedCallIds.current === currentIds) return;
    if (isFetchingRoute.current) return;

    const callFilter = currentQuestion as any;
    const driverLocation = callFilter?.driverLocation;
    if (!driverLocation || !driverLocation.centroid) return;

    let isMounted = true;
    isFetchingRoute.current = true;
    (async () => {
      try {
        const res = await RouteOptimizer.analyzeBatch(confirmedCalls, {
          code: driverLocation.code,
          name: driverLocation.name,
          center: driverLocation.centroid
        });
        if (isMounted) {
          setRouteResult(res);
          lastProcessedCallIds.current = currentIds;
        }
      } catch (e) {
        console.error('Failed to calculate route batch:', e);
      } finally {
        isFetchingRoute.current = false;
      }
    })();
    return () => { isMounted = false; };
  }, [confirmedCalls, currentQuestion, activeTab, gameState]);

  const calculateRouteResult = async (driverLocation: { code: string; name: string; centroid: [number, number] }) => {
    // Stage2ResultModal 등에서 수동으로 트리거할 수단 (자동화되었으므로 사실 안 불려도 됨)
    const currentIds = confirmedCalls.map(c => c.id).sort().join(',');
    if (confirmedCalls.length === 0 || !driverLocation) return;
    if (lastProcessedCallIds.current === currentIds) return;
    if (isFetchingRoute.current) return;

    isFetchingRoute.current = true;
    try {
      const res = await RouteOptimizer.analyzeBatch(confirmedCalls, {
        code: driverLocation.code,
        name: driverLocation.name,
        center: driverLocation.centroid
      });
      setRouteResult(res);
      lastProcessedCallIds.current = currentIds;
    } catch (e) {
      console.error('Failed to calculate route batch:', e);
    } finally {
      isFetchingRoute.current = false;
    }
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
      isFetchingOrder,
      setIsFetchingOrder,
      activeTab,
      setActiveTab,
      appendCall,
      routeResult,
      calculateRouteResult,
      selectedCallRoute
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
