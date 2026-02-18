import React, { createContext, useContext, type ReactNode, useState, useEffect, useCallback } from 'react';
import { MasteryStorage } from '../services/MasteryStorage';
import { useGeoData } from '../hooks/useGeoData';
import { useGameLogic } from '../hooks/useGameLogic';
import { useMapContext } from './MapContext'; // Added import
import { useSettings } from './SettingsContext';

import type { RegionCollection } from '../types/geo';
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
  mapData: RegionCollection | null;
  mapDataLevel2: RegionCollection | null;
  filteredMapData: RegionCollection | null;
  roadData: any;
  loading: boolean;
  progress: number;
  error: Error | null;
  lastFeedback: AnswerFeedback | null;
  answeredRegions: Set<string>;
  levelState: any;
  currentLevel: number;
  selectedChapter: string | null; // Track the currently selected chapter
}

// 빈 배열 상수를 외부에 정의하여 참조 안정성 확보
const EMPTY_REGIONS: any[] = [];

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 전체 데이터 로드
  const { data: fullMapData, level2Data, roadData, loading, progress, error } = useGeoData();
  const [filteredMapData, setFilteredMapData] = useState<RegionCollection | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  const { difficulty, updateTopScore, currentLevel } = useSettings();
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
    currentLevel,
    handleGameEnd,
    level2Data?.features || EMPTY_REGIONS
  );

  useEffect(() => {
    if (fullMapData && !filteredMapData) {
      setFilteredMapData(fullMapData);
    }
  }, [fullMapData, filteredMapData]);

  // Start Game with Chapter Code
  const startGame = (chapterCode?: string) => {
    if (!fullMapData) return;

    if (chapterCode) {
      setSelectedChapter(chapterCode);

      // Filter features for the selected chapter (City/Gu)
      // Assuming chapterCode is the SIG_CD (e.g., '41110' for Suwon-si)
      const filteredFeatures = fullMapData.features.filter((f: any) => {
        // Code structure: SIG_CD (5) + EMD_CD (3) + etc.
        return f.properties.code.startsWith(chapterCode);
      });

      const newFilteredData = {
        ...fullMapData,
        features: filteredFeatures
      };

      setFilteredMapData(newFilteredData);
      startGameLogic(filteredFeatures);
    } else {
      // Global mode or fallback
      setSelectedChapter(null);
      setFilteredMapData(fullMapData);
      startGameLogic(fullMapData.features);
    }
  };

  const value = {
    gameState,
    setGameState,
    currentQuestion,
    score,
    startTime,
    endTime,
    startGame,
    checkAnswer,
    resetGame,
    mapData: fullMapData,
    mapDataLevel2: level2Data,
    filteredMapData,
    roadData,
    loading,
    progress,
    error,
    lastFeedback,
    answeredRegions,
    levelState,
    currentLevel,
    selectedChapter
  };

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
