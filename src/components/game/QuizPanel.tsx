import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';
import { getLevelStrategy } from '../../game/levels/registry';

export const QuizPanel = () => {
  const { currentQuestion, checkAnswer } = useGame();
  const { currentLevel } = useSettings();

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur shadow-lg rounded-xl p-6 w-[90%] max-w-md border border-slate-200 text-center z-10">
      <div className="space-y-2">
        <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Find this area</p>
        <div className="text-3xl font-extrabold text-indigo-600 break-keep min-h-[40px]">
          {currentQuestion 
            ? getLevelStrategy(currentLevel).renderInstruction(currentQuestion)
            : <span className="text-slate-400 text-xl animate-pulse">다음 문제 준비 중...</span>
          }
        </div>
        
        {/* 레벨별 컨트롤 패널 (예: 거리 입력) */}
        {currentQuestion && getLevelStrategy(currentLevel).renderControlPanel?.(
            currentQuestion, 
            (input) => checkAnswer(input)
        )}
        <p className="text-xs text-slate-400">지도를 클릭하여 정답을 맞춰보세요!</p>
      </div>
    </div>
  );
};
