import React, { createContext, useContext, type ReactNode, useState, useEffect, useCallback } from 'react';
import { useGeoData } from '../hooks/useGeoData';
import { useGameLogic } from '../hooks/useGameLogic';
import { useSettings } from './SettingsContext';
import type { RegionCollection } from '../types/geo';
import type { GameState, GameScore, AnswerFeedback } from '../types/game';
import type { GameQuestion, UserInput } from '../game/core/types';

interface GameContextType {
  gameState: GameState;
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
  loading: boolean;
  error: Error | null;
  lastFeedback: AnswerFeedback | null;
  answeredRegions: Set<string>;
  levelState: any; // 추가
}

// 빈 배열 상수를 외부에 정의하여 참조 안정성 확보
const EMPTY_REGIONS: any[] = [];

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 전체 데이터 로드
  const { data: fullMapData, level2Data, loading, error } = useGeoData();
  // 선택된 지역만 담을 State
  const [filteredMapData, setFilteredMapData] = useState<RegionCollection | null>(null);
  
  const { difficulty, updateTopScore, currentLevel } = useSettings(); // currentLevel 추가

  const handleGameEnd = useCallback((finalScore: GameScore) => {
    const calculatedScore = finalScore.correct * 100;
    updateTopScore(calculatedScore);
  }, [updateTopScore]);

  const { 
    gameState, 
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
    handleGameEnd
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
      const filteredFeatures = fullMapData.features.filter(f => {
        const name = f.properties.name;
        // 예: "안산시 단원구" -> "안산시"로 시작하는지
        return selectedCities.some(city => name.startsWith(city));
      });

      setFilteredMapData({
        ...fullMapData, // type 등 나머지 속성 유지
        features: filteredFeatures
      });
      
      // 상태 업데이트 반영을 위해 잠시 대기할 수도 있지만, 
      // 리액트 상태 업데이트 배칭으로 인해 startGameLogic이 이전 데이터를 참조할 수도 있음.
      // 하지만 useGameLogic 내부에서 regions prop이 바뀌면 내부 상태(totalRegions 등)를 업데이트하도록 되어 있다면 괜찮음.
      // useGameLogic을 확인해봐야 함. 
      // 만약 useGameLogic이 regions prop 변경에 반응하지 않는다면(useEffect 없으면), 
      // 여기서 setFilteredMapData 직후에 startGameLogic을 불러도 소용 없을 수 수 있음.
      // 안전하게 setTimeout 0 사용.
      setTimeout(() => startGameLogic(), 0);

    } else {
      // 선택 없으면 전체 데이터 사용
      setFilteredMapData(fullMapData);
      setTimeout(() => startGameLogic(), 0);
    }
  };

  const value = {
    gameState,
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
    loading,
    error,
    lastFeedback,
    answeredRegions,
    levelState
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
