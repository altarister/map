import { useGame } from '../../contexts/GameContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export const ResultModal = () => {
  const { gameState, score, startGame } = useGame();

  // 점수 계산 (임시: 정답 * 100 - 오답 * 50)
  const totalScore = Math.max(0, score.correct * 100 - score.incorrect * 50);

  return (
    <Modal
      isOpen={gameState === 'RESULT'}
      onClose={() => { }} // 강제로 닫지 못하게 함
      title="MISSION DEBRIEF"
      footer={
        <Button onClick={() => startGame()} className="w-full" size="lg">
          RE-INITIALIZE OPERATION
        </Button>
      }
    >
      <div className="text-center space-y-8 py-4">
        <div className="space-y-2">
          <p className="text-muted-foreground font-mono tracking-widest text-xs uppercase">Total Performance Score</p>
          <div className="text-6xl font-black text-foreground tracking-tighter" style={{ textShadow: '0 0 30px rgba(var(--primary),0.2)' }}>
            {totalScore.toLocaleString()}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-muted/30 p-6 rounded-xl border border-border">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Targets Secured</span>
            <div className="text-3xl font-bold text-primary">{score.correct}</div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Errors</span>
            <div className="text-3xl font-bold text-destructive">{score.incorrect}</div>
          </div>
        </div>

        <div className="p-4 bg-secondary/10 border border-secondary/30 text-secondary-foreground rounded text-sm font-mono flex flex-col gap-1">
          <span className="text-[10px] opacity-70 uppercase">Mission Duration</span>
          <span className="text-lg font-bold">
            {(() => {
              const seconds = Math.floor(score.duration / 1000);
              const m = Math.floor(seconds / 60);
              const s = seconds % 60;
              return `${m > 0 ? `${m}m ` : ''}${s}s`;
            })()}
          </span>
        </div>
      </div>
    </Modal>
  );
};
