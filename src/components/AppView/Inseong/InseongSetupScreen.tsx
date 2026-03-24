import { useState } from 'react';
import { useGame } from '../../../contexts/GameContext';

interface Props {
  onClose?: () => void;
}

export const InseongSetupScreen = ({ onClose }: Props) => {
  const { 
    currentLocation, 
    targetDestination,
    maxPickupDistanceKm,
    minFare,
    startGame
  } = useGame();
  const savedSettings = localStorage.getItem('STAGE2_SETTINGS');
  const parsedSettings = savedSettings ? JSON.parse(savedSettings) : null;

  const [selectedDestCode, setSelectedDestCode] = useState<string>(parsedSettings?.targetDestCode || targetDestination?.code || 'ALL');
  const [pickupDistance, setPickupDistance] = useState<number>(parsedSettings?.maxPickupDistanceKm ?? maxPickupDistanceKm ?? 10);
  const [fareLimit, setFareLimit] = useState<number>(parsedSettings?.minFare ?? minFare ?? 30000);

  const [toggles, setToggles] = useState({
    noCollect: false,
    noStopover: false,
    noManual: true,
  });

  const handleStart = () => {
    const destSelect = document.getElementById('destSelect') as HTMLSelectElement;

    const dummyDest = { 
      code: selectedDestCode, 
      name: destSelect && selectedDestCode !== 'ALL' ? destSelect.options[destSelect.selectedIndex].text : '전체' 
    };
    
    // 로컬 스토리지에 설정값 캐싱
    localStorage.setItem('STAGE2_SETTINGS', JSON.stringify({
      targetDestCode: dummyDest.code,
      targetDestName: dummyDest.name,
      maxPickupDistanceKm: pickupDistance,
      minFare: fareLimit
    }));

    // startGame을 호출하면 InseongDispatchBoard의 리스트가 즉시 새 필터 기반으로 새로고침됨
    startGame({
      currentLocCode: currentLocation?.code,
      currentLocName: currentLocation?.name,
      targetDestCode: dummyDest.code,
      targetDestName: dummyDest.name,
      maxPickupDistanceKm: pickupDistance,
      minFare: fareLimit
    }, true); // forceRestart = true

    if (onClose) onClose();
  };

  const toggleOption = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#eef1f6] font-sans text-black select-none">
      {/* 상단 파란색 헤더 (배차보드와 동일한 톤) */}
      <div className="flex bg-[#0052a3] text-white items-center h-12 px-2 border-b-2 border-slate-500 shadow-sm shrink-0">
        <button className="text-white text-2xl px-2 font-bold mb-1" onClick={onClose}>‹</button>
        <div className="flex-1 text-center font-extrabold text-[17px]">콜 설정</div>
        <button className="text-white text-xl px-2" onClick={onClose}>✖</button>
      </div>
      
      {/* 서브 헤더/툴바 영역 */}
      <div className="flex bg-[#e4e4e4] border-b border-gray-400 text-xs text-gray-700 h-8 items-center px-3 justify-between font-bold shrink-0">
        <span>오더 필터 조건 설정</span>
        <span className="text-blue-800">자동매칭 ON</span>
      </div>

      {/* 설정 폼 (스크롤 영역) */}
      <div className="flex-1 overflow-y-auto bg-white flex flex-col pt-1 pb-16">
        
        {/* 현거점 / 상차거리 */}
        <div className="flex flex-col border-b border-gray-300">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-bold text-[15px] text-gray-800">현위치 (출발지)</span>
            <div className="bg-gray-100 text-gray-600 text-[13px] font-bold rounded py-1 px-3 border border-gray-200 shadow-inner">
              {currentLocation?.name || '지도에서 선택됨'} (자동감지)
            </div>
          </div>
          
          <div className="flex flex-col px-4 py-3 bg-[#fcfcfa]">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-[15px] text-gray-800">상차지 접근 허용 (공차)</span>
              <span className="text-blue-700 font-extrabold">{pickupDistance} km</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="range" min="1" max="50" step="1"
                value={pickupDistance} onChange={(e) => setPickupDistance(Number(e.target.value))}
                className="flex-1 h-3 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-[#0052a3]"
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-400 mt-1 font-bold">
              <span>1km (가까움)</span>
              <span>50km (멂)</span>
            </div>
          </div>
        </div>

        {/* 목적지 / 요금 */}
        <div className="flex flex-col border-b border-gray-300 mt-2 border-t">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-bold text-[15px] text-gray-800">희망 하차 지역 (퇴근길)</span>
            <select 
              id="destSelect"
              className="border border-blue-400 bg-white text-blue-900 text-sm font-extrabold rounded py-1 px-2 text-right outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedDestCode}
              onChange={(e) => setSelectedDestCode(e.target.value)}
            >
              <option value="ALL">전체 (조건 없음)</option>
              <option value="11">서울특별시 전체</option>
              <option value="28">인천광역시 전체</option>
              <option value="41110">경기도 수원시</option>
              <option value="41130">경기도 성남시</option>
              <option value="41150">경기도 의정부시</option>
              <option value="41480">경기도 파주시</option>
              <option value="41610">경기도 광주시</option>
            </select>
          </div>

          <div className="flex flex-col px-4 py-3 bg-[#fcfcfa]">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-[15px] text-gray-800">운임 단가 제한 (최소)</span>
            </div>
            <div className="flex items-center border border-gray-300 rounded overflow-hidden shadow-sm">
              <button 
                className="bg-gray-200 text-black px-4 py-2 font-extrabold hover:bg-gray-300"
                onClick={() => setFareLimit(Math.max(0, fareLimit - 5000))}
              >➖</button>
              <div className="flex-1 text-center font-extrabold text-[16px] text-[#d90000] bg-white py-2">
                {fareLimit.toLocaleString()} 원
              </div>
              <button 
                className="bg-gray-200 text-black px-4 py-2 font-extrabold hover:bg-gray-300 border-l border-gray-300"
                onClick={() => setFareLimit(fareLimit + 5000)}
              >➕</button>
            </div>
          </div>
        </div>

        {/* 기타 필터 토글 리스트 */}
        <div className="flex flex-col border-b border-gray-300 mt-2 border-t">
          <div className="px-4 py-2 bg-[#f5f5dc] border-b border-gray-300">
            <span className="font-bold text-[13px] text-gray-700">기타 오더 제외 옵션</span>
          </div>

          {/* Toggle 1 */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-white cursor-pointer hover:bg-gray-50" onClick={() => toggleOption('noCollect')}>
            <span className="font-bold text-[15px] text-gray-800">착불 오더 보지 않기</span>
            <div className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors ${toggles.noCollect ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'}`}>
              <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
            </div>
          </div>

          {/* Toggle 2 */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-white cursor-pointer hover:bg-gray-50" onClick={() => toggleOption('noStopover')}>
            <span className="font-bold text-[15px] text-gray-800">경유지 있는 오더 제외</span>
            <div className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors ${toggles.noStopover ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'}`}>
              <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
            </div>
          </div>

          {/* Toggle 3 */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-white cursor-pointer hover:bg-gray-50" onClick={() => toggleOption('noManual')}>
            <span className="font-bold text-[15px] text-gray-800">수작업(까데기) 오더 제외</span>
            <div className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors ${toggles.noManual ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'}`}>
              <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
            </div>
          </div>
        </div>

      </div>

      {/* 고정 하단 액션 바 */}
      <div className="absolute bottom-0 w-full bg-[#f8f9fa] border-t-2 border-slate-400 p-2 shadow-[0_-5px_15px_rgba(0,0,0,0.1)]">
        <button 
          onClick={handleStart}
          className="w-full bg-[#0052a3] text-white font-extrabold py-3 border border-blue-800 rounded text-lg shadow-sm active:bg-blue-700 flex justify-center items-center gap-2"
        >
          <span>✔ 설정 저장 및 리스트 새로고침</span>
        </button>
      </div>

    </div>
  );
};
