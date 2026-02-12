import { SettingsProvider } from './contexts/SettingsContext';
import { GameProvider, useGame } from './contexts/GameContext';
import { Map } from './components/game/Map';
import { RegionSelectScreen } from './components/game/RegionSelectScreen';
import { QuizPanel } from './components/game/QuizPanel';
import { ResultModal } from './components/game/ResultModal';
import { TopBar } from './components/layout/TopBar';

function GameContent() {
  const { gameState } = useGame();

  return (
    <div className="relative w-full h-[calc(100vh-64px)] flex items-center justify-center p-4">
       {/* 지도 (배경) - 항상 렌더링 */}
      <div className="absolute inset-0 w-full h-full">
        <Map />
      </div>

      {/* 게임 상태에 따른 UI */}
      {/* 
        IDLE: RegionSelectScreen (지역 선택 및 시작)
        PLAYING: QuizPanel (게임 진행)
        FINISHED: ResultModal (결과 표시)
      */}
      {gameState === 'IDLE' && <RegionSelectScreen />}
      
      {(gameState === 'PLAYING' || gameState === 'LOADING') && <QuizPanel />}
      
      <ResultModal />
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <GameProvider>
        <div className="w-full h-screen bg-slate-100 flex flex-col">
          <TopBar />
          <GameContent />
        </div>
      </GameProvider>
    </SettingsProvider>
  );
}

export default App;
