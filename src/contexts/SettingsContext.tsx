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
  fontSize: number; // 폰트 크기 배율 (기본 1.0)
  setFontSize: (size: number) => void;
  currentLevel: number;
  setCurrentLevel: (level: number) => void;
  showDebugInfo: boolean;
  setShowDebugInfo: (show: boolean) => void;
  showGameInfo: boolean;
  setShowGameInfo: (show: boolean) => void;
  theme: 'tactical' | 'kids';
  setTheme: (theme: 'tactical' | 'kids') => void;
  viewOptions: {
    showLayerControl: boolean;
    showScaleBar: boolean;
    showGameLog: boolean;
  };
  setViewOptions: (options: { showLayerControl: boolean; showScaleBar: boolean; showGameLog: boolean; }) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [difficulty, setDifficulty] = useLocalStorage<Difficulty>('game-difficulty', 'EASY');
  const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>('game-sound', true);
  const [topScore, setTopScore] = useLocalStorage<number>('game-top-score', 0);
  const [fontSize, setFontSize] = useLocalStorage<number>('game-font-size', 1.0);
  const [currentLevel, setCurrentLevel] = useLocalStorage<number>('game-level', 1);
  const [showDebugInfo, setShowDebugInfo] = useLocalStorage<boolean>('game-debug-info', false);
  const [showGameInfo, setShowGameInfo] = useLocalStorage<boolean>('game-game-info', true);
  const [theme, setTheme] = useLocalStorage<'tactical' | 'kids'>('game-theme', 'tactical');

  // New View Options State
  const [viewOptions, setViewOptions] = useLocalStorage('game-view-options', {
    showLayerControl: true,
    showScaleBar: true,
    showGameLog: true,
  });

  // Apply theme class to body
  React.useEffect(() => {
    const root = window.document.body;
    root.classList.remove('theme-tactical', 'theme-kids');
    root.classList.add(`theme-${theme}`);
  }, [theme]);

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
      updateTopScore,
      fontSize,
      setFontSize,
      currentLevel,
      setCurrentLevel,
      showDebugInfo,
      setShowDebugInfo,
      showGameInfo,
      setShowGameInfo,
      theme,
      setTheme,
      viewOptions,
      setViewOptions
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
