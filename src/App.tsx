import { SettingsProvider } from './contexts/SettingsContext';
import { GameProvider, useGame } from './contexts/GameContext';
import { MapProvider } from './contexts/MapContext';
import { Map } from './components/game/Map';
import { RegionSelectScreen } from './components/game/RegionSelectScreen';

import { ResultModal } from './components/game/ResultModal';
import { TopBar } from './components/layout/TopBar';
import { DebugInfoPanel } from './components/game/DebugInfoPanel';
import { GameInfoPanel } from './components/game/GameInfoPanel';
import { ActionBar } from './components/game/ActionBar';

function GameContent() {
  const { gameState } = useGame();

  return (
    <div className="relative w-full h-[calc(100vh-64px)] flex items-center justify-center p-4">
      {/* Map (배경) - 항상 렌더링 */}
      <div className="absolute inset-0 w-full h-full">
        <Map />
      </div>

      {/* State별 UI Overlay */}

      {/* ActionBar (PLAYING 상태에서 Accordion 애니메이션) */}
      <ActionBar />

      {/* INITIAL: 최초 진입 (Map만 표시, 반투명 오버레이) */}
      {gameState === 'INITIAL' && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      )}

      {/* LEVEL_SELECT: 레벨/지역 선택 모달 */}
      {gameState === 'LEVEL_SELECT' && <RegionSelectScreen />}



      {/* RESULT: 결과 모달 */}
      <ResultModal />

      {/* Info Panels (항상 표시) */}
      <DebugInfoPanel />
      <GameInfoPanel />
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <GameProvider>
        <MapProvider>
          <div className="w-full h-screen bg-slate-100 flex flex-col">
            <TopBar />
            <GameContent />
          </div>
        </MapProvider>
      </GameProvider>
    </SettingsProvider>
  );
}

export default App;
