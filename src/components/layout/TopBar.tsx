import { useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';
import { SettingsModal } from '../game/SettingsModal';

export const TopBar = () => {
  const { score, gameState, setGameState, resetGame } = useGame();
  const { topScore } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleRestart = () => {
    resetGame();
  };

  const handleStart = () => {
    setGameState('LEVEL_SELECT');
  };

  return (
    <>
      <header className="h-16 border-b border-border glass-panel flex items-center justify-between px-6 z-50 fixed top-0 w-full">
        {/* Left: Title & Version */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest leading-none mb-1">Application</span>
            <h1 className="text-lg font-bold text-foreground tracking-tight leading-none">
              1DAL TRAINER <span className="text-muted-foreground font-normal text-xs ml-1">v1.3.0</span>
            </h1>
          </div>
        </div>

        {/* Center: System Status */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest leading-none mb-1">System Status</span>
          <div className="flex gap-4 font-mono text-xs">
            <span className={`${gameState === 'PLAYING' ? 'text-primary' : 'text-destructive'}`}>
              [Game: {gameState === 'PLAYING' ? 'ON' : 'OFF'}]
            </span>
            <span className="text-primary">
              [Map: ON]
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-6">
          {/* Score Display (Visible during game or after) */}
          {gameState !== 'INITIAL' && (
            <div className="flex gap-4 text-xs font-mono">
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-muted-foreground uppercase">Best</span>
                <span className="text-foreground font-bold">{topScore.toString().padStart(4, '0')}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-muted-foreground uppercase">Current</span>
                <span className={`font-bold ${gameState === 'PLAYING' ? 'text-primary' : 'text-muted-foreground'}`}>
                  {(score.correct * 100).toString().padStart(4, '0')}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            {gameState === 'INITIAL' && (
              <button
                onClick={handleStart}
                className="px-6 py-2 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity rounded-sm"
              >
                ▶ START SESSION
              </button>
            )}

            {(gameState === 'PLAYING' || gameState === 'RESULT') && (
              <button
                onClick={handleRestart}
                className="text-xs font-mono text-muted-foreground hover:text-destructive transition-colors uppercase tracking-wider"
              >
                [ABORT]
              </button>
            )}

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </>
  );
};
