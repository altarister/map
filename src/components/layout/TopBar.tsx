import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';

export const TopBar = () => {
  const { score, gameState, resetGame } = useGame();
  const { topScore } = useSettings();

  const handleRestart = () => {
    resetGame();
    // startGame(); // 지역 선택 화면으로 돌아가려면 resetGame만 호출하면 됨 (IDLE 상태로 감)
  };

  return (
    <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-slate-800">경기도 지도 퀴즈</h1>
        {gameState === 'PLAYING' && (
          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
            게임 진행 중
          </span>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="text-slate-600">
          <span className="text-xs text-slate-400 mr-1">최고 점수</span>
          <span className="font-bold">{topScore}</span>
        </div>
        
        <div className="text-slate-600">
          <span className="text-xs text-slate-400 mr-1">현재 점수</span>
          <span className="font-bold text-indigo-600">{score.correct * 100}</span>
        </div>

        {gameState !== 'IDLE' && (
          <button 
            onClick={handleRestart}
            className="text-sm text-slate-500 hover:text-red-500 transition-colors"
          >
            그만하기
          </button>
        )}
      </div>
    </div>
  );
};
