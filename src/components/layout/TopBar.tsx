import { useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';
import { SettingsModal } from '../overlays/SettingsModal';

export const TopBar = () => {
  const { gameState, setGameState, resetGame, score, currentStage, setSelectionDepth, setCurrentFocusCode } = useGame();
  const { topScore } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <header className="h-12 fixed top-0 w-full z-50 flex items-center justify-between px-5
        bg-[#06060a]/95 backdrop-blur-xl
        border-b border-white/[0.06]
        shadow-[0_1px_0_rgba(255,255,255,0.03),0_4px_24px_rgba(0,0,0,0.5)]"
      >
        {/* LEFT: Brand */}
        <div className="flex items-center gap-3">
          {/* Green status dot */}
          <div className="relative flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <div className="absolute w-3 h-3 rounded-full bg-emerald-500/20 animate-ping" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-sm font-bold text-white tracking-tight leading-none">
              1달 트레이너
            </h1>
            <span className="text-[9px] font-mono text-white/20 tracking-widest">v1.3.0</span>
          </div>
        </div>

        {/* CENTER: Game stats — PLAYING 상태에서만 */}
        <div className="flex items-center">
          {gameState === 'PLAYING' && (
            <div className="flex items-center gap-4 font-mono">
              <div className="flex flex-col items-center">
                <span className="text-[8px] text-white/30 uppercase tracking-widest leading-none mb-0.5">최고기록</span>
                <span className="text-xs font-bold text-white/40">{String(topScore).padStart(4, '0')}</span>
              </div>
              <div className="w-px h-5 bg-white/10" />
              <div className="flex flex-col items-center">
                <span className="text-[8px] text-emerald-500/60 uppercase tracking-widest leading-none mb-0.5">현재점수</span>
                <span className="text-xs font-bold text-emerald-400">{String(score.correct * 100).padStart(4, '0')}</span>
              </div>
              <div className="w-px h-5 bg-white/10" />
              <div className="flex flex-col items-center">
                <span className="text-[8px] text-white/30 uppercase tracking-widest leading-none mb-0.5">레벨</span>
                <span className="text-xs font-bold text-white/70">{currentStage ?? '-'}</span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-3">
          {gameState === 'INITIAL' && (
            <button
              onClick={() => setGameState('REGION_SELECT')}
              className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold font-mono uppercase tracking-widest
                bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded
                hover:bg-emerald-500/25 hover:border-emerald-500/50 transition-all"
            >
              <span>▶</span> 게임 시작
            </button>
          )}

          {gameState === 'REGION_SELECT' && (
            <button
              onClick={() => {
                setSelectionDepth(1);
                setCurrentFocusCode(null);
                setGameState('GAME_MODE_SELECT');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider
                text-white/40 hover:text-white/70 border border-white/[0.07] rounded
                bg-white/[0.03] hover:bg-white/[0.06] transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              코스 선택
            </button>
          )}

          {(gameState === 'PLAYING' || gameState === 'RESULT') && (
            <button
              onClick={resetGame}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider
                text-red-500/50 hover:text-red-400 border border-red-500/10 rounded
                hover:border-red-500/30 hover:bg-red-500/5 transition-all"
            >
              ✕ 중단
            </button>
          )}

          {/* Divider */}
          <div className="w-px h-5 bg-white/[0.07]" />

          {/* Settings */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all"
            title="설정"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </>
  );
};
