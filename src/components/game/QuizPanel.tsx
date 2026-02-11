import { useGame } from '../../contexts/GameContext';

export const QuizPanel = () => {
  const { currentQuestion } = useGame();

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur shadow-lg rounded-xl p-6 w-[90%] max-w-md border border-slate-200 text-center z-10">
      <div className="space-y-2">
        <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Find this area</p>
        <h2 className="text-3xl font-extrabold text-indigo-600 break-keep">
          {currentQuestion?.regionName || '...'}
        </h2>
        <p className="text-xs text-slate-400">지도를 클릭하여 정답을 맞춰보세요!</p>
      </div>
    </div>
  );
};
