import React, { createContext, useContext, type ReactNode, useState, useEffect, useCallback } from 'react';
import { useGeoData } from '../hooks/useGeoData';
import { useGameLogic } from '../hooks/useGameLogic';
import { useSettings } from './SettingsContext';
import type { RegionCollection } from '../types/geo';
import type { GameState, GameScore, AnswerFeedback } from '../types/game';
import type { GameQuestion, UserInput } from '../game/core/types';

interface GameContextType {
  gameState: GameState;
  setGameState: (state: GameState) => void; // 추가
  currentQuestion: GameQuestion | null; // QuizQuestion -> GameQuestion
  score: GameScore;
  startTime: number | null;
  endTime: number | null;
  startGame: (selectedCities?: string[]) => void;
  checkAnswer: (input: UserInput) => void; // string -> UserInput
  resetGame: () => void;
  mapData: RegionCollection | null; // 원본 데이터 (Level 3 - Detailed)
  mapDataLevel2: RegionCollection | null; // LOD Level 2 데이터 (Simple)
  filteredMapData: RegionCollection | null; // 필터링된 데이터
  roadData: any; // 추가: 도로 데이터
  loading: boolean;
  progress: number; // 추가: 로딩 진행률 (0-100)
  error: Error | null;
  lastFeedback: AnswerFeedback | null;
  answeredRegions: Set<string>;
  levelState: any;
  currentLevel: number; // 추가
}

// 빈 배열 상수를 외부에 정의하여 참조 안정성 확보
const EMPTY_REGIONS: any[] = [];

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 전체 데이터 로드 (이제 roadData와 progress도 반환됨)
  const { data: fullMapData, level2Data, roadData, loading, progress, error } = useGeoData();
  // 선택된 지역만 담을 State
  const [filteredMapData, setFilteredMapData] = useState<RegionCollection | null>(null);

  const { difficulty, updateTopScore, currentLevel } = useSettings(); // currentLevel 추가

  const handleGameEnd = useCallback((finalScore: GameScore) => {
    const calculatedScore = finalScore.correct * 100;
    updateTopScore(calculatedScore);
  }, [updateTopScore]);

  const {
    gameState,
    setGameState, // 추가
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
    // 게임 로직은 필터링된 데이터를 기반으로 동작
    // filteredMapData가 없으면 안정적인 EMPTY_REGIONS 참조 전달
    filteredMapData?.features || EMPTY_REGIONS,
    difficulty,
    currentLevel, // level 전달
    handleGameEnd,
    level2Data?.features || EMPTY_REGIONS // ✅ BUG-003 FIX: Level 2 데이터 전달
  );

  // 초기 로딩 완료 시 filteredMapData를 전체 데이터로 초기화 (IDLE 상태 표시용)
  useEffect(() => {
    if (fullMapData && !filteredMapData) {
      setFilteredMapData(fullMapData);
    }
  }, [fullMapData, filteredMapData]);

  // 게임 시작 시 선택된 도시들로 데이터 필터링 후 게임 시작
  const startGame = (selectedCities?: string[]) => {
    if (!fullMapData) return;

    if (selectedCities && selectedCities.length > 0) {
      // 선택된 시/군 이름으로 시작하는 Feature만 필터링
      const filteredFeatures = fullMapData.features.filter((f: any) => { // any 타입 임시 허용 (RegionFeature 타입 확인 필요)
        const parentName = f.properties.SIG_KOR_NM || f.properties.name;
        // 예: "안산시 단원구" -> "안산시"로 시작하는지
        return selectedCities.some(city => parentName.startsWith(city));
      });

      const newFilteredData = {
        ...fullMapData, // type 등 나머지 속성 유지
        features: filteredFeatures
      };

      setFilteredMapData(newFilteredData);

      // ✅ BUG FIX: 비동기 Update 문제 해결
      // useGameLogic의 startGame에 필터링된 데이터를 직접 전달하여
      // 즉시 그 데이터를 기반으로 첫 문제를 생성하도록 함.
      startGameLogic(filteredFeatures);

    } else {
      // 선택 없으면 전체 데이터 사용
      setFilteredMapData(fullMapData);
      startGameLogic(fullMapData.features);
    }
  };

  const value = {
    gameState,
    setGameState, // 추가
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
    roadData, // 추가
    loading,
    progress, // 추가
    error,
    lastFeedback,
    answeredRegions,
    levelState,
    currentLevel // 추가
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
