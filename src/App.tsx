import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { GameProvider, useGame } from './contexts/GameContext';
import { MapProvider } from './contexts/MapContext';
import { Map } from './components/game/Map';
// Changed: RegionSelectScreen -> GameOptionSelectScreen
import { GameOptionSelectScreen } from './components/game/GameOptionSelectScreen';

import { ResultModal } from './components/game/ResultModal';
import { TopBar } from './components/layout/TopBar';
import { GameInfoPanel } from './components/game/GameInfoPanel';
import { ActionBar } from './components/game/ActionBar';


import { useState } from 'react';
import { LoadingScreen } from './components/game/LoadingScreen';

function GameContent() {
  const { gameState } = useGame();
  const { viewOptions } = useSettings();
  const [hasStarted, setHasStarted] = useState(false);

  return (
    <div className="relative w-full h-full flex items-center justify-center pt-16">
      {/* Loading Screen Overlay (Visible until started) */}
      {!hasStarted && (
        <LoadingScreen onStart={() => setHasStarted(true)} />
      )}

      {/* Map (배경) - 항상 렌더링 (로딩 중에는 Map 내부에서 Loading 텍스트 렌더링됨) */}
      <div className="absolute inset-0 w-full h-full">
        <Map />
      </div>

      {/* State별 UI Overlay (게임 시작 후에만 표시) */}
      {hasStarted && (
        <>


          {/* ActionBar (PLAYING 상태에서 Accordion 애니메이션) */}
          <ActionBar />



          {/* INITIAL: 최초 진입 (Map만 표시, 반투명 오버레이) */}
          {gameState === 'INITIAL' && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none" />
          )}

          {/* LEVEL_SELECT: 레벨/지역 선택 모달 */}
          {/* Replaced RegionSelectScreen with GameOptionSelectScreen */}
          {gameState === 'LEVEL_SELECT' && <GameOptionSelectScreen />}

          {/* RESULT: 결과 모달 */}
          <ResultModal />

          {/* Info Panels (항상 표시) */}
          {viewOptions.showGameLog && <GameInfoPanel />}
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <MapProvider>
        <GameProvider>
          <div className="w-full h-screen bg-slate-100 flex flex-col">
            <TopBar />
            <GameContent />
          </div>
        </GameProvider>
      </MapProvider>
    </SettingsProvider>
  );
}

export default App;
