import { useGame } from '../../contexts/GameContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export const ResultModal = () => {
  const {
    gameState, score,
    resetGame, replayGame, backToRegionSelect,
    setSelectionLevel, setCurrentFocusCode
  } = useGame();

  // 숙련도(정확도) 계산
  const totalAttempts = score.correct + score.incorrect;
  const accuracy = totalAttempts > 0 ? Math.floor((score.correct / totalAttempts) * 100) : 0;
  const isPerfect = accuracy === 100 && totalAttempts > 0;

  const handleBackOneDepth = () => {
    // selectionDepth/currentFocusCode 유지한 채 REGION_SELECT로 복귀
    backToRegionSelect();
  };

  const handleReplay = () => {
    // 동일한 지역·동일한 설정으로 즉시 재시작
    replayGame();
  };

  const handleGoHome = () => {
    // 처음(광역 선택)으로 완전 초기화
    setSelectionLevel('PROVINCE');
    setCurrentFocusCode(null);
    resetGame();
  };

  return (
    <Modal
      isOpen={gameState === 'RESULT'}
      onClose={handleBackOneDepth}
      title="게임 결과"
      footer={
        <div className="flex flex-col gap-2 w-full">
          <div className="flex gap-2 w-full">
            <Button onClick={handleBackOneDepth} variant="outline" className="flex-1" size="lg">
              ← 지역 선택
            </Button>
            <Button onClick={handleReplay} className="flex-1" size="lg">
              🔄 다시 하기
            </Button>
          </div>
          <Button onClick={handleGoHome} variant="outline" className="w-full text-muted-foreground text-xs" size="sm">
            ⌂ 처음으로 돌아가기
          </Button>
        </div>
      }
    >
      <div className="text-center space-y-6 py-2">

        {/* Mastery / Score Display */}
        <div className="relative py-4">
          <div className="space-y-1">
            <p className="text-muted-foreground font-mono tracking-widest text-xs uppercase">훈련 정확도</p>
            <div className={`text-6xl font-black tracking-tighter ${isPerfect ? 'text-amber-500' : 'text-foreground'}`} style={{ textShadow: isPerfect ? '0 0 30px rgba(245, 158, 11, 0.4)' : 'none' }}>
              {accuracy}%
            </div>
          </div>

          {isPerfect && (
            <div className="absolute top-0 right-0 left-0 flex justify-center pointer-events-none">
              <div className="animate-bounce mt-[-20px] bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-1 rounded-full font-bold shadow-lg border border-white/20 transform rotate-[-2deg]">
                👑 지역 마스터!
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 bg-muted/30 p-5 rounded-xl border border-border">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">정답</span>
            <div className="text-3xl font-bold text-green-500">{score.correct}</div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">오답</span>
            <div className={`text-3xl font-bold ${score.incorrect > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>{score.incorrect}</div>
          </div>
        </div>

        {/* Missed Targets List */}
        {score.missedRegions && score.missedRegions.length > 0 && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 text-left">
            <h4 className="text-xs font-bold text-destructive uppercase tracking-wider mb-2 flex items-center gap-2">
              <span>⚠️</span> 틀린 지역 ({score.missedRegions.length})
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
          소요 시간: {Math.floor(score.duration / 1000)}초
        </div>
      </div>
    </Modal>
  );
};
