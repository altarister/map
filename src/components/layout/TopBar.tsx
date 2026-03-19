import { useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';

import { SettingsModal } from '../overlays/SettingsModal';

export const TopBar = () => {
  const { gameState, setGameState, resetGame, score, currentStage } = useGame();
  const { topScore } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleRestart = () => {
    resetGame();
  };

  const handleStart = () => {
    setGameState('REGION_SELECT');
  };

  return (
    <>
      <header className="h-16 glass-header rounded-none border-none flex items-center justify-between px-6 z-50 fixed top-0 w-full">
        {/* Left: Title & Version */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest leading-none mb-1">애플리케이션</span>
            <h1 className="text-lg font-bold text-foreground tracking-tight leading-none">
              1달 트레이너 <span className="text-muted-foreground font-normal text-xs ml-1">v1.3.0</span>
            </h1>
          </div>
        </div>

        {/* Center: Score Display (PLAYING 상태에서만 표시) */}
        <div className="flex flex-col items-center gap-0.5">
          {gameState === 'PLAYING' && (
            <div className="flex items-center gap-5 font-mono">
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-muted-foreground uppercase tracking-widest">최고기록</span>
                <span className="text-sm font-bold text-muted-foreground">{String(topScore).padStart(4, '0')}</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-green-500/70 uppercase tracking-widest">현재점수</span>
                <span className="text-sm font-bold text-green-400">{String(score.correct * 100).padStart(4, '0')}</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-muted-foreground uppercase tracking-widest">레벨</span>
                <span className="text-sm font-bold text-foreground">{currentStage ?? '-'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-6">
          {/* Score Display (제거됨: GameInfoPanel로 이동) */}

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            {gameState === 'INITIAL' && (
              <button
                onClick={handleStart}
                className="px-6 py-2 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                ▶ 게임 시작
              </button>
            )}

            {/* REGION_SELECT 상태에서 코스 선택 화면으로 돌아가는 버튼 추가 */}
            {gameState === 'REGION_SELECT' && (
              <button
                onClick={() => setGameState('GAME_MODE_SELECT')}
                className="text-xs font-mono font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider flex items-center gap-1 bg-black/20 px-3 py-1.5 rounded-full border border-white/10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                코스 다시 선택
              </button>
            )}

            {(gameState === 'PLAYING' || gameState === 'RESULT') && (
              <button
                onClick={handleRestart}
                className="text-xs font-mono text-muted-foreground hover:text-destructive transition-colors uppercase tracking-wider"
              >
                [중단하기]
              </button>
            )}

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="설정"
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
