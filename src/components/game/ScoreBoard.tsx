import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';

export const ScoreBoard = () => {
  const { score, gameState } = useGame();
  const { topScore } = useSettings();

  if (gameState === 'IDLE') return null;

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
      
      <div className="bg-white/90 backdrop-blur shadow-md rounded-lg p-3 border border-slate-200 min-w-[120px]">
        <div className="flex justify-between items-center text-xs text-slate-500 font-semibold mb-1">
          <span>SCORE</span>
          {topScore > 0 && <span className="text-amber-500">🏆 {topScore}</span>}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-green-600">{score.correct}</span>
          <span className="text-slate-400">/</span>
          <span className="text-sm font-medium text-red-500">-{score.incorrect}</span>
        </div>
      </div>
    </div>
  );
};
