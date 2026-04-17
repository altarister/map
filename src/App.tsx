import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { GameProvider, useGame } from './contexts/GameContext';
import { GeoDataProvider } from './contexts/GeoDataContext';
import { MapProvider } from './contexts/MapContext';
import { DispatchProvider } from './contexts/DispatchContext';
import { Map } from './components/map';
import { GameModeSelectScreen } from './components/game/GameModeSelectScreen';

import { ResultModal } from './components/game/ResultModal';
import { TopBar } from './components/layout/TopBar';

import { Stage1ActionBar } from './components/game/Stage1ActionBar';
import { Stage2App } from './components/game/Stage2App';
import { AdSlot } from './components/ui/AdSlot';
import { StandaloneInseongView } from './components/game/StandaloneInseongView';

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { InseongSetupPage } from './pages/InseongSetupPage';
import { InseongDispatchPage } from './pages/InseongDispatchPage';

import { useState } from 'react';
import { LoadingScreen } from './components/layout/LoadingScreen';
import type { ViewportPadding } from './types/game';

function GameContent() {
  const { gameState, setGameState, currentStage } = useGame();
  const { viewOptions } = useSettings();
  const [hasStarted, setHasStarted] = useState(false);

  // 현재 화면에 띄워진 UI 패널(광고, 인성앱, 헤더 등)을 피해 지도의 실질적 중앙을 잡기 위한 여백 계산
  const getMapPadding = (): ViewportPadding => {
    // TopBar(64) + 기본 여백(16)
    let padding: ViewportPadding = { top: 80, right: 16, bottom: 16, left: 16 };

    // 게임 전반적인 상태가 LOBBY가 아닌 실제 진입 상태일 때
    if (hasStarted) {
      // 1. 우측 광고 슬롯 (현재 300px + 여백)
      if (viewOptions.showAd) {
        padding.right += 320;
      }

      // 2. 좌측 패널들 (스테이지별)
      if (currentStage === 2 && (gameState === 'PLAYING' || gameState === 'SET_DESTINATION')) {
        // 인성 앱 크기(380) + 여백
        padding.left += 400;
      }

      // 3. 상단 액션바 (스테이지 1)
      if (currentStage === 1 && gameState === 'PLAYING') {
        padding.top += 120;
      }
    }

    return padding;
  };

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
        <Map padding={getMapPadding()} />
      </div>

      {/* State별 UI Overlay (게임 시작 후에만 표시) */}
      {hasStarted && (
        <>


          {/* 1단계 전용 ActionBar */}
          {currentStage === 1 && <Stage1ActionBar />}

          {/* 2단계 전용 AppLayout 모듈 (모달/UI 관장을 전부 위임) */}
          {currentStage === 2 && <Stage2App />}

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



          {/* REGION_SELECT: 레벨/지역 선택 모달 */}
          {/* Now handled directly by Map.tsx and RegionModeSelectPopup */}

          {/* RESULT: 1단계 전용 결과 모달 */}
          {currentStage === 1 && <ResultModal />}


        </>
      )}
    </div>
  );
}

/** 기존 지도 게임 앱 (변경 없음) */
function GameApp() {
  const isStandalone = new URLSearchParams(window.location.search).get('mode') === 'standalone';

  return (
    <SettingsProvider>
      <GeoDataProvider>
        <MapProvider>
          <GameProvider>
            <DispatchProvider>
              {isStandalone ? (
                <StandaloneInseongView />
              ) : (
                <div className="w-full h-screen bg-slate-100 flex flex-col">
                  <TopBar />
                  <GameContent />
                </div>
              )}
            </DispatchProvider>
          </GameProvider>
        </MapProvider>
      </GeoDataProvider>
    </SettingsProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 시뮬레이터 전용 경로 (GameContext 의존성 없음) */}
        <Route path="/inseong" element={<InseongSetupPage />} />
        <Route path="/inseong/dispatch" element={<InseongDispatchPage />} />

        {/* 기존 지도 게임 (변경 없음) */}
        <Route path="/*" element={<GameApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
