import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { GameProvider, useGame } from './contexts/GameContext';
import { GeoDataProvider } from './contexts/GeoDataContext';
import { MapProvider } from './contexts/MapContext';
import { Map } from './components/map';
import { GameModeSelectScreen } from './components/game/GameModeSelectScreen';

import { ResultModal } from './components/game/ResultModal';
import { TopBar } from './components/layout/TopBar';

import { Stage1ActionBar } from './components/game/Stage1ActionBar';
import { Stage2DispatchBoard } from './components/game/Stage2DispatchBoard';
import { Stage2SetupModal } from './components/game/Stage2SetupModal';
import { AdSlot } from './components/ui/AdSlot';


import { useState } from 'react';
import { LoadingScreen } from './components/layout/LoadingScreen';

function GameContent() {
  const { gameState, setGameState, currentStage } = useGame();
  const { viewOptions } = useSettings();
  const [hasStarted, setHasStarted] = useState(false);

  return (
    <div className="relative w-full h-full flex items-center justify-center pt-16">
      {/* Loading Screen Overlay (Visible until started) */}
      {!hasStarted && (
        <LoadingScreen onStart={() => {
          setHasStarted(true);
          // Directly go to Mode Selection
          setGameState('GAME_MODE_SELECT');
        }} />
      )}

      {/* Map (배경) - 항상 렌더링 (로딩 중에는 Map 내부에서 Loading 텍스트 렌더링됨) */}
      <div className="absolute inset-0 w-full h-full">
        <Map />
      </div>

      {/* State별 UI Overlay (게임 시작 후에만 표시) */}
      {hasStarted && (
        <>


          {/* 1단계 전용 ActionBar */}
          {currentStage === 1 && <Stage1ActionBar />}

          {/* 2단계 전용 Call Dispatch Board */}
          {currentStage === 2 && <Stage2DispatchBoard />}

          {/* 우측 전역 광고 슬롯 (Google AdSense 삽입 예정) */}
          {viewOptions.showAd && (
            <div className="absolute top-20 right-4 z-[35]">
                <AdSlot width={300} height={250} />
            </div>
          )}



          {/* INITIAL: 최초 진입 (Map만 표시, 반투명 오버레이) */}
          {gameState === 'INITIAL' && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none" />
          )}

          {/* ADDED: Game Mode Selection Screen */}
          {gameState === 'GAME_MODE_SELECT' && <GameModeSelectScreen />}

          {/* 2단계 전용: 희망 노선 설정 팝업 */}
          {gameState === 'SET_DESTINATION' && <Stage2SetupModal />}

          {/* REGION_SELECT: 레벨/지역 선택 모달 */}
          {/* Now handled directly by Map.tsx and RegionModeSelectPopup */}

          {/* RESULT: 결과 모달 */}
          <ResultModal />


        </>
      )}
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <GeoDataProvider>
        <MapProvider>
          <GameProvider>
            <div className="w-full h-screen bg-slate-100 flex flex-col">
              <TopBar />
              <GameContent />
            </div>
          </GameProvider>
        </MapProvider>
      </GeoDataProvider>
    </SettingsProvider>
  );
}

export default App;
