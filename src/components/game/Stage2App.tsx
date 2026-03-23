import { InseongApp } from '../AppView/Inseong';
import { useGame } from '../../contexts/GameContext';

export const Stage2App = () => {
  const { gameState } = useGame();
  
  // 현재는 인성콜 UI만 연동하지만, 추후 24시콜 등 앱 타입에 따라 분기 가능
  // const appType = 'INSEONG';

  // 설정 화면이나 플레이 중이 아닐 때는 폰 껍데기를 그리지 않음
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
