import { InseongApp } from '../AppView/Inseong';
import { Stage2ResultModal } from '../AppView/Inseong/Stage2ResultModal';
import { useGame } from '../../contexts/GameContext';
import { useDispatchContext } from '../../contexts/DispatchContext';
import { useGeoContext } from '../../contexts/GeoDataContext';

export const Stage2App = () => {
  const { gameState, currentLocation, resetGame, startGame } = useGame();
  const { confirmedCalls, setConfirmedCalls } = useDispatchContext();
  const { fullMapData } = useGeoContext();
  
  // 현재는 인성콜 UI만 연동하지만, 추후 24시콜 등 앱 타입에 따라 분기 가능
  // const appType = 'INSEONG';

  // RESULT (정산) 화면 - 풀스크린 모달 형태 (지도 위에 오버레이)
  if (gameState === 'RESULT') {
    return (
      <div className="absolute inset-0 z-[60] flex items-center justify-center p-6 pointer-events-none">
        <div className="pointer-events-auto">
          <Stage2ResultModal 
            confirmedCalls={confirmedCalls}
            currentLocation={currentLocation}
            fullMapData={fullMapData}
            onRetry={() => {
              setConfirmedCalls([]);
              resetGame();
              startGame({}, true); // 기존 설정 유지하며 리스타트
            }}
            onExit={() => {
              setConfirmedCalls([]);
              resetGame();
            }}
          />
        </div>
      </div>
    );
  }

  // 설정 화면이나 플레이 중이 아닐 때는 폰 껍데기(인성앱)를 그리지 않음
  if (gameState !== 'SET_DESTINATION' && gameState !== 'PLAYING') {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-[60]">
      
      {/* 폰 화면 공통 프레임 (항상 좌측 상단 고정, 높이/너비 부여) */}
      <div className="pointer-events-auto absolute top-16 left-6 w-[380px] h-[620px] max-h-[calc(100vh-120px)] shadow-[0_15px_50px_rgba(0,0,0,0.6)] rounded-xl overflow-hidden border border-gray-700 bg-black flex flex-col">
        {/* 구동되는 앱 컨텐츠 위임 */}
        <InseongApp />
      </div>

    </div>
  );
};
