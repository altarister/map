import { useState } from 'react';
import { useGame } from '../../../contexts/GameContext';

export const InseongSetupScreen = () => {
  const { startGame } = useGame();
  
  const [currentLocCode, setCurrentLocCode] = useState<string>('41110'); // 수원시
  const [selectedDestCode, setSelectedDestCode] = useState<string>('41610'); // 광주시
  const [pickupDistance, setPickupDistance] = useState<number>(15);
  const [fareLimit, setFareLimit] = useState<number>(30000);

  const [toggles, setToggles] = useState({
    noCollect: false,
    noStopover: false,
    noManual: true,
  });

  const handleStart = () => {
    const locSelect = document.getElementById('locSelect') as HTMLSelectElement;
    const destSelect = document.getElementById('destSelect') as HTMLSelectElement;

    const dummyCurrent = { 
      code: currentLocCode, 
      name: locSelect ? locSelect.options[locSelect.selectedIndex].text : '설정됨' 
    };
    const dummyDest = { 
      code: selectedDestCode, 
      name: destSelect ? destSelect.options[destSelect.selectedIndex].text : '전체' 
    };
    
    startGame({
      currentLocCode: dummyCurrent.code,
      currentLocName: dummyCurrent.name,
      targetDestCode: dummyDest.code,
      targetDestName: dummyDest.name,
      maxPickupDistanceKm: pickupDistance,
      minFare: fareLimit
    });
  };

  const toggleOption = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#eef1f6] font-sans text-black select-none">
      {/* 상단 파란색 헤더 (배차보드와 동일한 톤) */}
      <div className="flex bg-[#0052a3] text-white items-center h-12 px-2 border-b-2 border-slate-500 shadow-sm shrink-0">
        <button className="text-white text-2xl px-2 font-bold mb-1">‹</button>
        <div className="flex-1 text-center font-extrabold text-[17px]">콜 설정</div>
        <button className="text-white text-xl px-2">↻</button>
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
            <select 
              id="locSelect"
              className="border border-gray-300 bg-gray-50 text-gray-800 text-sm font-bold rounded py-1 px-2 text-right outline-none focus:border-blue-500"
              value={currentLocCode}
              onChange={(e) => setCurrentLocCode(e.target.value)}
            >
              <option value="41110">현재: 수원시 (GPS)</option>
              <option value="41130">현재: 성남시 (GPS)</option>
              <option value="41460">현재: 용인시 (GPS)</option>
              <option value="41280">현재: 고양시 (GPS)</option>
              <option value="41480">현재: 파주시 (GPS)</option>
            </select>
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
            <span className="font-bold text-[15px] text-gray-800">희망 도착지 (하차 존)</span>
            <select 
              id="destSelect"
              className="border border-gray-300 bg-gray-50 text-gray-800 text-sm font-bold rounded py-1 px-2 text-right outline-none focus:border-blue-500"
              value={selectedDestCode}
              onChange={(e) => setSelectedDestCode(e.target.value)}
            >
              <option value="41110">수원시 전체</option>
              <option value="41610">광주시 전체</option>
              <option value="41460">용인시 전체</option>
              <option value="41280">고양시 전체</option>
              <option value="41480">파주시 전체</option>
              <option value="41390">시흥시 전체</option>
              <option value="41590">화성시 전체</option>
              <option value="ALL">전국 무관</option>
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
          className="w-full bg-[#ffb400] text-black font-extrabold py-3 border border-gray-500 rounded text-lg shadow-sm active:bg-yellow-500 flex justify-center items-center gap-2"
        >
          <span>✔ 설정 저장 및 콜 받기</span>
        </button>
      </div>

    </div>
  );
};
