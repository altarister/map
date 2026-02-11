import React, { createContext, useContext, type ReactNode } from 'react';
import type { Difficulty } from '../types/game';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface SettingsContextType {
  difficulty: Difficulty;
  setDifficulty: (difficulty: Difficulty) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  topScore: number;
  updateTopScore: (score: number) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [difficulty, setDifficulty] = useLocalStorage<Difficulty>('game-difficulty', 'EASY');
  const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>('game-sound', true);
  const [topScore, setTopScore] = useLocalStorage<number>('game-top-score', 0);

  const updateTopScore = (score: number) => {
    if (score > topScore) {
      setTopScore(score);
    }
  };

  return (
    <SettingsContext.Provider value={{ 
      difficulty, 
      setDifficulty, 
      soundEnabled, 
      setSoundEnabled,
      topScore,
      updateTopScore
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
