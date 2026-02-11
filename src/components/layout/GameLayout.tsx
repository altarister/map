import { Map } from '../game/Map';
import { QuizPanel } from '../game/QuizPanel';
import { ScoreBoard } from '../game/ScoreBoard';
import { ResultModal } from '../game/ResultModal';

export const GameLayout = () => {
  return (
    <div className="relative w-full h-screen bg-slate-100 overflow-hidden flex flex-col">
      {/* 헤더 영역 (선택 사항) */}
      <header className="absolute top-0 left-0 w-full p-4 z-10 pointer-events-none">
        <div className="flex justify-between items-start">
          <div className="pointer-events-auto">
            {/* 로고나 타이틀이 들어갈 수 있음 (지금은 QuizPanel이 역할을 대신함) */}
          </div>
          <div className="pointer-events-auto">
            <ScoreBoard />
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 영역 (지도) */}
      <main className="flex-1 w-full h-full relative">
        <Map />
        
        {/* 중앙 패널 (퀴즈 표시 등) */}
        <QuizPanel />
      </main>

      {/* 모달 등 오버레이 */}
      <ResultModal />
      
      {/* 푸터 영역 (저작권 등) */}
      <footer className="absolute bottom-2 right-2 text-[10px] text-slate-400 pointer-events-none">
        © 2026 Freight Mapper MVP. Map data from KOSIS.
      </footer>
    </div>
  );
};
