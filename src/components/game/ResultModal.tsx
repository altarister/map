import { useGame } from '../../contexts/GameContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export const ResultModal = () => {
  const { gameState, score, startGame, resetGame, selectedChapter } = useGame();

  // 숙련도(정확도) 계산
  const totalAttempts = score.correct + score.incorrect;
  const accuracy = totalAttempts > 0 ? Math.floor((score.correct / totalAttempts) * 100) : 0;
  const isPerfect = accuracy === 100 && totalAttempts > 0;

  return (
    <Modal
      isOpen={gameState === 'RESULT'}
      onClose={() => { }} // 강제로 닫지 못하게 함
      title="MISSION DEBRIEFING"
      footer={
        <div className="flex gap-3 w-full">
          <Button onClick={resetGame} variant="outline" className="flex-1" size="lg">
            SELECT NEW SECTOR
          </Button>
          <Button onClick={() => startGame(selectedChapter || undefined)} className="flex-1" size="lg">
            RETRY MISSION
          </Button>
        </div>
      }
    >
      <div className="text-center space-y-6 py-2">

        {/* Mastery / Score Display */}
        <div className="relative py-4">
          <div className="space-y-1">
            <p className="text-muted-foreground font-mono tracking-widest text-xs uppercase">Operation Accuracy</p>
            <div className={`text-6xl font-black tracking-tighter ${isPerfect ? 'text-amber-500' : 'text-foreground'}`} style={{ textShadow: isPerfect ? '0 0 30px rgba(245, 158, 11, 0.4)' : 'none' }}>
              {accuracy}%
            </div>
          </div>

          {isPerfect && (
            <div className="absolute top-0 right-0 left-0 flex justify-center pointer-events-none">
              <div className="animate-bounce mt-[-20px] bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-1 rounded-full font-bold shadow-lg border border-white/20 transform rotate-[-2deg]">
                👑 SECTOR MASTERED
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 bg-muted/30 p-5 rounded-xl border border-border">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Secured</span>
            <div className="text-3xl font-bold text-green-500">{score.correct}</div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Errors</span>
            <div className={`text-3xl font-bold ${score.incorrect > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>{score.incorrect}</div>
          </div>
        </div>

        {/* Missed Targets List */}
        {score.missedRegions && score.missedRegions.length > 0 && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 text-left">
            <h4 className="text-xs font-bold text-destructive uppercase tracking-wider mb-2 flex items-center gap-2">
              <span>⚠️</span> Missed Targets ({score.missedRegions.length})
            </h4>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-destructive/20 pr-2">
              {Array.from(new Set(score.missedRegions)).map((region, idx) => (
                <span key={idx} className="text-xs font-medium px-2 py-1 bg-background border border-destructive/30 text-destructive rounded-md">
                  {region}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="text-[10px] opacity-50 font-mono uppercase">
          Mission Time: {Math.floor(score.duration / 1000)}s
        </div>
      </div>
    </Modal>
  );
};
