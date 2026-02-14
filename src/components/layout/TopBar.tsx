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
      <div className="h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-6 shadow-sm z-10">
        {/* Left: Title */}
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">1DAL Trainer</h1>
        </div>

        {/* Center: System Status (MVP 원칙: 텍스트만) */}
        <div className="flex gap-6 font-mono text-sm">
          <span className={`
            ${gameState === 'PLAYING' ? 'text-green-500' : 'text-red-500'}
          `}>
            [Game: {gameState === 'PLAYING' ? 'ON' : 'OFF'}]
          </span>
          <span className="text-green-500">
            [Map: ON]
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          {/* START Button (INITIAL 상태에서만 표시) */}
          {gameState === 'INITIAL' && (
            <button
              onClick={handleStart}
              className="px-6 py-2 bg-green-500 text-black font-bold hover:bg-green-400 transition-colors"
            >
              ▶ START
            </button>
          )}

          {/* Score Display */}
          {gameState !== 'INITIAL' && (
            <div className="flex gap-4">
              <div className="text-gray-400 text-sm">
                <span className="text-xs mr-1">Best</span>
                <span className="font-bold text-white">{topScore}</span>
              </div>
              <div className="text-gray-400 text-sm">
                <span className="text-xs mr-1">Score</span>
                <span className="font-bold text-green-500">{score.correct * 100}</span>
              </div>
            </div>
          )}

          {/* 그만하기 버튼 */}
          {(gameState === 'PLAYING' || gameState === 'RESULT') && (
            <button
              onClick={handleRestart}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors px-2 py-1"
            >
              그만하기
            </button>
          )}

          {/* 설정 버튼 (기존 유지) */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-gray-400 hover:text-green-500 transition-colors rounded-full hover:bg-slate-800"
            title="설정"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </>
  );
};
