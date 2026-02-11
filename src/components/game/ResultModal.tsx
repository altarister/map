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
      onClose={() => {}} // 강제로 닫지 못하게 함
      title="GAME OVER"
      footer={
        <Button onClick={() => startGame()} className="w-full">
          다시 도전하기
        </Button>
      }
    >
      <div className="text-center space-y-6 py-4">
        <div className="space-y-2">
          <p className="text-slate-500">최종 점수</p>
          <div className="text-5xl font-black text-indigo-600 tracking-tighter">
            {totalScore.toLocaleString()}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
          <div className="space-y-1">
            <span className="text-sm text-slate-500">맞춘 지역</span>
            <div className="text-2xl font-bold text-green-600">{score.correct}</div>
          </div>
          <div className="space-y-1">
            <span className="text-sm text-slate-500">틀린 횟수</span>
            <div className="text-2xl font-bold text-red-500">{score.incorrect}</div>
          </div>
        </div>

        <div className="p-3 bg-blue-50 text-blue-700 rounded text-sm font-medium">
          {(() => {
            const seconds = Math.floor(score.duration / 1000);
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return `${m > 0 ? `${m}분 ` : ''}${s}초`;
          })()} 동안 플레이했습니다.
        </div>
      </div>
    </Modal>
  );
};
