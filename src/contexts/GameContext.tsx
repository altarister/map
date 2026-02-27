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
  startGame: (chapterCode?: string) => void; // Changed from selectedCities array to single chapterCode
  checkAnswer: (input: UserInput) => void;
  resetGame: () => void;
  lastFeedback: AnswerFeedback | null;
  answeredRegions: Set<string>;
  levelState: any;
  currentStage: number;
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
    if ((gameState === 'REGION_SELECT' || gameState === 'GAME_MODE_SELECT') && fullMapData) {
      // Only reset if it's currently filtered (optimization)
      if (filteredMapData !== fullMapData) {
        setFilteredMapData(fullMapData);
        setSelectedChapter(null);
      }
    }
  }, [gameState, fullMapData, filteredMapData, setFilteredMapData, setSelectedChapter]);

  // Start Game with Chapter Code
  const startGame = useCallback((chapterCode?: string) => {
    if (gameState === 'PLAYING') return;

    if (!fullMapData) return;

    // Level 1: 도로 레이어 OFF (성능 최적화 + 게임 집중)
    // Level 2+: 도로 레이어 ON (기본 설정 복원)
    // if (currentStage === 1) {
    //   setLayerVisibility({
    //     roadMotorway: false,
    //     roadTrunk: false,
    //     roadPrimary: false,
    //     roadSecondary: false,
    //     roadOther: false,
    //   });
    // } else {
    //   setLayerVisibility({
    //     roadMotorway: true,
    //     roadTrunk: true,
    //     roadPrimary: true,
    //   });
    // }

    if (chapterCode) {
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
  }), [
    gameState, setGameState, currentQuestion, score, startTime, endTime, startGame, checkAnswer, resetGame,
    lastFeedback, answeredRegions, levelState, currentStage
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
