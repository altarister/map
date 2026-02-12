import { useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';
import { SettingsModal } from '../game/SettingsModal';

export const TopBar = () => {
  const { score, gameState, resetGame } = useGame();
  const { topScore } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleRestart = () => {
    resetGame();
  };

  return (
    <>
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-800">경기도 지도 퀴즈</h1>
          {gameState === 'PLAYING' && (
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
              게임 진행 중
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden sm:block text-slate-600">
            <span className="text-xs text-slate-400 mr-1">최고 점수</span>
            <span className="font-bold">{topScore}</span>
          </div>
          
          <div className="hidden sm:block text-slate-600">
            <span className="text-xs text-slate-400 mr-1">현재 점수</span>
            <span className="font-bold text-indigo-600">{score.correct * 100}</span>
          </div>

          <div className="flex items-center gap-2">
            {gameState !== 'IDLE' && (
              <button 
                onClick={handleRestart}
                className="text-sm text-slate-500 hover:text-red-500 transition-colors px-2 py-1"
              >
                그만하기
              </button>
            )}
            
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-slate-100"
              title="설정"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </>
  );
};
