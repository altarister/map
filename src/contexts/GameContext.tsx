/* eslint-disable @typescript-eslint/no-explicit-any, react-refresh/only-export-components, react-hooks/exhaustive-deps */
import React, { createContext, useContext, type ReactNode, useEffect, useCallback, useMemo } from 'react';
import { MasteryStorage } from '../services/MasteryStorage';
import { useGeoContext } from './GeoDataContext';
import { useGameLogic } from '../hooks/useGameLogic';
import { useMapContext } from './MapContext'; // Added import
import { useSettings } from './SettingsContext';

import type { GameState, GameScore, AnswerFeedback } from '../types/game';
import type { GameQuestion, UserInput } from '../game/core/types';
import type { SelectionLevel } from '../types/region';

interface GameContextType {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  currentQuestion: GameQuestion | null;
  totalQuestions: number;
  score: GameScore;
  startTime: number | null;
  endTime: number | null;
  startGame: (options?: { chapterCode?: string, overrideRegions?: any[], highlightRegions?: any[], isBasicMode?: boolean, targetDestCode?: string }) => void;
  checkAnswer: (input: UserInput) => void;
  skipQuestion: () => void;
  resetGame: () => void;
  replayGame: () => void;           // 방금 진행한 게임 동일 옵션으로 재시작
  backToRegionSelect: () => void;   // depth 유지하며 REGION_SELECT로 (한 뎁스 위)
  lastFeedback: AnswerFeedback | null;
  answeredRegions: Set<string>;
  levelState: any;
  isHintActive: boolean;
  setHintActive: (active: boolean) => void;
  currentStage: number;
  isBasicMode: boolean;
  highlightRegions: any[];
  selectionLevel: SelectionLevel;
  setSelectionLevel: (level: SelectionLevel) => void;
  currentFocusCode: string | null;
  setCurrentFocusCode: (code: string | null) => void;
  targetDestination: { code: string; name: string } | null;
  setTargetDestination: (dest: { code: string; name: string } | null) => void;
}

// 빈 배열 상수를 외부에 정의하여 참조 안정성 확보
const EMPTY_REGIONS: any[] = [];

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 정적 지리 데이터 구독
  const {
    fullMapData,
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
  const [lastGameOptions, setLastGameOptions] = React.useState<{ chapterCode?: string, overrideRegions?: any[], highlightRegions?: any[], isBasicMode?: boolean } | undefined>(undefined);

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
    answeredRegions,
    levelState,
    isHintActive,
    setHintActive
  } = useGameLogic(
    filteredMapData?.features || EMPTY_REGIONS,
    difficulty,
    currentStage,
    handleGameEnd,
    targetDestination
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
  const startGame = useCallback((options?: { chapterCode?: string, overrideRegions?: any[], highlightRegions?: any[], isBasicMode?: boolean, targetDestCode?: string }) => {
    if (gameState === 'PLAYING') return;
    if (!fullMapData) return;

    setLastGameOptions(options);
    setIsBasicMode(options?.isBasicMode ?? false);
    setHighlightRegions(options?.highlightRegions ?? []);

    // 2단계: targetDestCode를 즉시 반영 (async setState race condition 방지)
    if (options?.targetDestCode) {
      setTargetDestination({ code: options.targetDestCode, name: '' });
    }

    const chapterCode = options?.chapterCode;
    const overrideRegions = options?.overrideRegions;

    if (overrideRegions) {
      if (chapterCode) setSelectedChapter(chapterCode);
      const newFilteredData = { ...fullMapData, features: overrideRegions };
      setFilteredMapData(newFilteredData);
      startGameLogic(overrideRegions);
    } else if (chapterCode) {
      setSelectedChapter(chapterCode);

      const filteredFeatures = fullMapData.features.filter((f: any) =>
        f.properties.code.startsWith(chapterCode)
      );

      const newFilteredData = { ...fullMapData, features: filteredFeatures };
      setFilteredMapData(newFilteredData);
      startGameLogic(filteredFeatures);
    } else {
      setSelectedChapter(null);
      setFilteredMapData(fullMapData);
      startGameLogic(fullMapData.features);
    }
  }, [gameState, fullMapData, currentStage, startGameLogic, setFilteredMapData, setSelectedChapter]);

  // 방금 진행한 게임 동일 옵션으로 재시작
  const replayGame = useCallback(() => {
    resetGame();
    startGame(lastGameOptions);
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
    answeredRegions,
    levelState,
    isHintActive,
    setHintActive,
    currentStage,
    isBasicMode,
    highlightRegions,
    selectionLevel,
    setSelectionLevel,
    currentFocusCode,
    setCurrentFocusCode,
    targetDestination,
    setTargetDestination
  }), [
    gameState, setGameState, currentQuestion, totalQuestions, score, startTime, endTime, startGame, checkAnswer, resetGameWithDepth,
    lastFeedback, answeredRegions, levelState, isHintActive, setHintActive, currentStage, isBasicMode, highlightRegions,
    skipQuestion, selectionLevel, currentFocusCode, replayGame, backToRegionSelect, targetDestination
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
