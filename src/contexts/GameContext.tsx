/* eslint-disable @typescript-eslint/no-explicit-any, react-refresh/only-export-components, react-hooks/exhaustive-deps */
import React, { createContext, useContext, type ReactNode, useEffect, useCallback, useMemo } from 'react';
import { MasteryStorage } from '../services/MasteryStorage';
import { useGeoContext } from './GeoDataContext';
import { useGameLogic } from '../hooks/useGameLogic';
import { useMapContext } from './MapContext'; // Added import
import { useSettings } from './SettingsContext';

import type { GameState, GameScore, AnswerFeedback } from '../types/game';
import type { GameQuestion, UserInput } from '../game/core/types';

interface GameContextType {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  currentQuestion: GameQuestion | null;
  score: GameScore;
  startTime: number | null;
  endTime: number | null;
  startGame: (options?: { chapterCode?: string, overrideRegions?: any[], highlightRegions?: any[], isBasicMode?: boolean }) => void;
  checkAnswer: (input: UserInput) => void;
  resetGame: () => void;
  lastFeedback: AnswerFeedback | null;
  answeredRegions: Set<string>;
  levelState: any;
  currentStage: number;
  isBasicMode: boolean;
  highlightRegions: any[]; // Used for watermark Eup/Myeon rendering
  selectedRegionForMode: { code: string; isGuCity: boolean; name: string } | null;
  setSelectedRegionForMode: (region: { code: string; isGuCity: boolean; name: string } | null) => void;
}

// 빈 배열 상수를 외부에 정의하여 참조 안정성 확보
const EMPTY_REGIONS: any[] = [];

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 정적 지리 데이터 구독
  const {
    fullMapData,
    cityData,
    filteredMapData,
    setFilteredMapData,
    selectedChapter,
    setSelectedChapter
  } = useGeoContext();

  const { difficulty, updateTopScore, currentStage } = useSettings();
  const { layerVisibility } = useMapContext();
  const [isBasicMode, setIsBasicMode] = React.useState<boolean>(false);
  const [highlightRegions, setHighlightRegions] = React.useState<any[]>([]);
  const [selectedRegionForMode, setSelectedRegionForMode] = React.useState<{ code: string; isGuCity: boolean; name: string } | null>(null);

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
    startTime,
    endTime,
    startGame: startGameLogic,
    checkAnswer,
    resetGame,
    lastFeedback,
    answeredRegions,
    levelState
  } = useGameLogic(
    filteredMapData?.features || EMPTY_REGIONS,
    difficulty,
    currentStage,
    handleGameEnd,
    cityData?.features || EMPTY_REGIONS
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
  const startGame = useCallback((options?: { chapterCode?: string, overrideRegions?: any[], highlightRegions?: any[], isBasicMode?: boolean }) => {
    if (gameState === 'PLAYING') return;

    if (!fullMapData) return;

    setIsBasicMode(options?.isBasicMode ?? false);
    setHighlightRegions(options?.highlightRegions ?? []);

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

  const value = useMemo(() => ({
    gameState,
    setGameState,
    currentQuestion,
    score,
    startTime,
    endTime,
    startGame,
    checkAnswer,
    resetGame,
    lastFeedback,
    answeredRegions,
    levelState,
    currentStage,
    isBasicMode,
    highlightRegions,
    selectedRegionForMode,
    setSelectedRegionForMode
  }), [
    gameState, setGameState, currentQuestion, score, startTime, endTime, startGame, checkAnswer, resetGame,
    lastFeedback, answeredRegions, levelState, currentStage, isBasicMode, highlightRegions, selectedRegionForMode, setSelectedRegionForMode
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
