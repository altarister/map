/* eslint-disable @typescript-eslint/no-explicit-any, react-refresh/only-export-components, react-hooks/exhaustive-deps */
import React, { createContext, useContext, type ReactNode, useEffect, useCallback, useMemo } from 'react';
import { MasteryStorage } from '../services/MasteryStorage';
import { useGeoContext } from './GeoDataContext';
import { useGameLogic } from '../hooks/useGameLogic';
import { useMapContext } from './MapContext'; // Added import
import { useSettings } from './SettingsContext';

import type { GameState, GameScore, AnswerFeedback } from '../types/game';
import type { GameQuestion, UserInput, CallItem } from '../game/core/types';
import type { SelectionLevel } from '../types/region';

interface GameContextType {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  currentQuestion: GameQuestion | null;
  totalQuestions: number;
  score: GameScore;
  startTime: number | null;
  endTime: number | null;
  startGame: (options?: { 
    chapterCode?: string; 
    overrideRegions?: any[]; 
    highlightRegions?: any[]; 
    isBasicMode?: boolean; 
    targetDestCode?: string; 
    targetDestName?: string;
    currentLocCode?: string;
    currentLocName?: string;
    maxPickupDistanceKm?: number;
    minFare?: number;
  }, forceRestart?: boolean) => void;
  checkAnswer: (input: UserInput) => void;
  skipQuestion: () => void;
  resetGame: () => void;
  replayGame: () => void;           // 방금 진행한 게임 동일 옵션으로 재시작
  backToRegionSelect: () => void;   // depth 유지하며 REGION_SELECT로 (한 뎁스 위)
  lastFeedback: AnswerFeedback | null;
  setLastFeedback: (feedback: AnswerFeedback | null) => void;
  answeredRegions: Set<string>;
  levelState: any;
  isHintActive: boolean;
  setHintActive: (active: boolean) => void;
  selectedCallId: string | null;
  setSelectedCallId: (id: string | null) => void;
  currentStage: number;
  isBasicMode: boolean;
  highlightRegions: any[];
  selectionLevel: SelectionLevel;
  setSelectionLevel: (level: SelectionLevel) => void;
  currentFocusCode: string | null;
  setCurrentFocusCode: (code: string | null) => void;
  targetDestination: { code: string; name: string } | null;
  setTargetDestination: (dest: { code: string; name: string } | null) => void;
  currentLocation: { code: string; name: string } | null;
  setCurrentLocation: (loc: { code: string; name: string } | null) => void;
  maxPickupDistanceKm: number;
  setMaxPickupDistanceKm: (dist: number) => void;
  minFare: number;
  setMinFare: (fare: number) => void;
  fullMapData: any | null;
  setFullMapData: (data: any | null) => void;
  appendCall: (call: CallItem) => void;
  confirmedCallIds: string[];
  setConfirmedCallIds: (ids: string[]) => void;
}

// 빈 배열 상수를 외부에 정의하여 참조 안정성 확보
const EMPTY_REGIONS: any[] = [];

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 정적 지리 데이터 구독
  const {
    // fullMapData, // Removed from useGeoContext
    filteredMapData,
    setFilteredMapData,
    selectedChapter,
    setSelectedChapter
  } = useGeoContext();

  const { difficulty, updateTopScore, currentStage } = useSettings();
  const { layerVisibility } = useMapContext();
  const [isBasicMode, setIsBasicMode] = React.useState<boolean>(false);
  const [highlightRegions, setHighlightRegions] = React.useState<any[]>([]);
  const [selectionLevel, setSelectionLevel] = React.useState<SelectionLevel>('PROVINCE');
  const [currentFocusCode, setCurrentFocusCode] = React.useState<string | null>(null);
  const [targetDestination, setTargetDestination] = React.useState<{ code: string; name: string } | null>(null);
  const [currentLocation, setCurrentLocation] = React.useState<{ code: string; name: string } | null>(null);
  const [maxPickupDistanceKm, setMaxPickupDistanceKm] = React.useState<number>(10);
  const [minFare, setMinFare] = React.useState<number>(30000); // 2단계 자동배차 최소단가
  const [lastGameOptions, setLastGameOptions] = React.useState<any>(undefined);
  
  // 3단계용 전체 지도 데이터 보관 (매번 필터링 방지)
  const [fullMapData, setFullMapData] = React.useState<any | null>(null);

  const [confirmedCallIds, setConfirmedCallIds] = React.useState<string[]>([]);
  const [selectedCallId, setSelectedCallId] = React.useState<string | null>(null);

  const handleGameEnd = useCallback((finalScore: GameScore) => {
    // 1. Top Score Update (Legacy global score)
    const calculatedScore = finalScore.correct * 100;
    updateTopScore(calculatedScore);

    // 2. Mastery System Update
    if (layerVisibility.labels) {
      console.log('Practice Mode: Score not saved.');
      return;
    }

    if (selectedChapter) {
      const totalAttempts = finalScore.correct + finalScore.incorrect;
      let masteryPercentage = 0;

      // Accuracy-based Mastery
      if (totalAttempts > 0) {
        masteryPercentage = Math.floor((finalScore.correct / totalAttempts) * 100);
      }

      // Save to localStorage (Only updates if higher)
      MasteryStorage.saveMastery(selectedChapter, masteryPercentage);
    }
  }, [updateTopScore, selectedChapter, layerVisibility]);

  const {
    gameState,
    setGameState,
    score,
    currentQuestion,
    totalQuestions,
    startTime,
    endTime,
    startGame: startGameLogic,
    checkAnswer,
    skipQuestion,
    resetGame,
    lastFeedback,
    setLastFeedback,
    answeredRegions,
    levelState,
    isHintActive,
    setHintActive,
    appendCall
  } = useGameLogic(
    filteredMapData?.features || EMPTY_REGIONS,
    difficulty,
    currentStage,
    handleGameEnd,
    targetDestination,
    currentLocation,
    maxPickupDistanceKm,
    minFare
  );

  // Reset Map Data when entering Level Select or Mode Select
  useEffect(() => {
    if ((gameState === 'REGION_SELECT' || gameState === 'GAME_MODE_SELECT' || gameState === 'SUBREGION_SELECT') && fullMapData) {
      setHighlightRegions([]); // 이전 게임의 테두리 하이라이트 초기화
      // Only reset if it's currently filtered (optimization)
      if (filteredMapData !== fullMapData && gameState !== 'SUBREGION_SELECT') {
        setFilteredMapData(fullMapData);
        setSelectedChapter(null);
      }
    }
  }, [gameState, fullMapData, filteredMapData, setFilteredMapData, setSelectedChapter]);

  // Start Game with Chapter Code or Options
  const startGame = useCallback((options?: { 
    chapterCode?: string; 
    overrideRegions?: any[]; 
    highlightRegions?: any[]; 
    isBasicMode?: boolean; 
    targetDestCode?: string; 
    targetDestName?: string;
    currentLocCode?: string;
    currentLocName?: string;
    maxPickupDistanceKm?: number;
    minFare?: number;
  }, forceRestart = false) => {
    if (gameState === 'PLAYING' && !forceRestart) return;
    if (!fullMapData) return;

    // 만약 옵션이 주어지고 forceRestart면 기존 lastGameOptions와 병합
    const effectiveOptions = forceRestart && lastGameOptions && options
      ? { ...lastGameOptions, ...options }
      : options || (forceRestart ? lastGameOptions : undefined);

    setLastGameOptions(effectiveOptions);
    setIsBasicMode(effectiveOptions?.isBasicMode ?? false);
    setHighlightRegions(effectiveOptions?.highlightRegions ?? []);

    // 2단계: 필터 세팅 즉시 반영 (async setState race condition 방지)
    if (effectiveOptions?.targetDestCode) {
      setTargetDestination({ code: effectiveOptions.targetDestCode, name: effectiveOptions.targetDestName || '' });
    }
    if (effectiveOptions?.currentLocCode) {
      setCurrentLocation({ code: effectiveOptions.currentLocCode, name: effectiveOptions.currentLocName || '' });
    }
    if (effectiveOptions?.maxPickupDistanceKm !== undefined) {
      setMaxPickupDistanceKm(effectiveOptions.maxPickupDistanceKm);
    }
    if (effectiveOptions?.minFare !== undefined) {
      setMinFare(effectiveOptions.minFare);
    }

    const chapterCode = effectiveOptions?.chapterCode;
    const overrideRegions = effectiveOptions?.overrideRegions;

    const filterParams = {
      targetDestCode: effectiveOptions?.targetDestCode,
      currentLocCode: effectiveOptions?.currentLocCode,
      maxPickupDistanceKm: effectiveOptions?.maxPickupDistanceKm,
      minFare: effectiveOptions?.minFare
    };

    if (overrideRegions) {
      if (chapterCode) setSelectedChapter(chapterCode);
      const newFilteredData = { ...fullMapData, features: overrideRegions };
      setFilteredMapData(newFilteredData);
      startGameLogic(overrideRegions, filterParams);
    } else if (chapterCode) {
      setSelectedChapter(chapterCode);

      const filteredFeatures = fullMapData.features.filter((f: any) =>
        f.properties.code.startsWith(chapterCode)
      );

      const newFilteredData = { ...fullMapData, features: filteredFeatures };
      setFilteredMapData(newFilteredData);
      startGameLogic(filteredFeatures, filterParams);
    } else {
      setSelectedChapter(null);
      setFilteredMapData(fullMapData);
      startGameLogic(fullMapData.features, filterParams);
    }
  }, [gameState, fullMapData, currentStage, startGameLogic, setFilteredMapData, setSelectedChapter]);

  // 방금 진행한 게임 동일 옵션으로 재시작
  const replayGame = useCallback(() => {
    resetGame();
    startGame(lastGameOptions, true);
  }, [resetGame, startGame, lastGameOptions]);

  // depth 유지하며 REGION_SELECT로 복귀 (한 뎁스 위 선택)
  const backToRegionSelect = useCallback(() => {
    resetGame();
  }, [resetGame]);

  // [4계층 연동] 나가기 시 depth 리셋 포함
  const resetGameWithDepth = useCallback(() => {
    resetGame();
    setSelectionLevel('PROVINCE');
    setCurrentFocusCode(null);
    setTargetDestination(null);
    setCurrentLocation(null);
  }, [resetGame]);

  const value = useMemo(() => ({
    gameState,
    setGameState,
    currentQuestion,
    totalQuestions,
    score,
    startTime,
    endTime,
    startGame,
    checkAnswer,
    skipQuestion,
    resetGame: resetGameWithDepth,
    replayGame,
    backToRegionSelect,
    lastFeedback,
    setLastFeedback,
    answeredRegions,
    levelState,
    isHintActive,
    setHintActive,
    selectedCallId,
    setSelectedCallId,
    currentStage,
    isBasicMode,
    highlightRegions,
    selectionLevel,
    setSelectionLevel,
    currentFocusCode,
    setCurrentFocusCode,
    targetDestination,
    setTargetDestination,
    currentLocation,
    setCurrentLocation,
    maxPickupDistanceKm,
    setMaxPickupDistanceKm,
    minFare,
    setMinFare,
    fullMapData: fullMapData?.features || [],
    setFullMapData, // Added
    appendCall,
    confirmedCallIds, // Added
    setConfirmedCallIds // Added
  }), [
    gameState, setGameState, currentQuestion, totalQuestions, score, startTime, endTime, startGame, checkAnswer, resetGameWithDepth,
    lastFeedback, setLastFeedback, answeredRegions, levelState, isHintActive, setHintActive, currentStage, isBasicMode, highlightRegions,
    skipQuestion, selectionLevel, currentFocusCode, replayGame, backToRegionSelect, targetDestination, setTargetDestination, currentLocation,
    setCurrentLocation,
    maxPickupDistanceKm,
    setMaxPickupDistanceKm,
    minFare,
    setMinFare,
    selectedCallId, setSelectedCallId, fullMapData, setFullMapData, appendCall, confirmedCallIds, setConfirmedCallIds
  ]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
