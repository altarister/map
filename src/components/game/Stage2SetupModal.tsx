import { useState } from 'react';
import { useGame } from '../../contexts/GameContext';

export const Stage2SetupModal = () => {
  const { startGame } = useGame();
  
  const [currentLocCode, setCurrentLocCode] = useState<string>('41110'); // 기본 수원시
  const [selectedDestCode, setSelectedDestCode] = useState<string>('41610'); // 기본 경기 광주
  const [maxPickupDistance, setMaxPickupDistance] = useState<number>(15);
  const [minFare, setMinFare] = useState<number>(30000);

  const handleStart = () => {
    const destSelect = document.getElementById('destSelect') as HTMLSelectElement;
    const locSelect = document.getElementById('locSelect') as HTMLSelectElement;

    startGame({
      targetDestCode: selectedDestCode,
      targetDestName: destSelect ? destSelect.options[destSelect.selectedIndex].text : '설정됨',
      currentLocCode: currentLocCode,
      currentLocName: locSelect ? locSelect.options[locSelect.selectedIndex].text : '설정됨',
      maxPickupDistanceKm: maxPickupDistance,
      minFare: minFare
    });
  };

  const RegionOptions = () => (
    <>
      <option value="41110">수원시</option>
      <option value="41130">성남시</option>
      <option value="41460">용인시</option>
      <option value="41590">화성시</option>
      <option value="41610">광주시</option>
      <option value="41280">고양시</option>
      <option value="41190">부천시</option>
      <option value="41270">안산시</option>
      <option value="41150">의정부시</option>
      <option value="41360">남양주시</option>
      <option value="41480">파주시</option>
      <option value="41570">김포시</option>
    </>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#081425] w-full max-w-sm rounded-[16px] overflow-hidden border border-[#2a3548] shadow-2xl animate-fade-in-up">

        {/* Header */}
        <div className="p-5 bg-[#111c2d] border-b border-[#2a3548] flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-[#00e676]/20 flex items-center justify-center mb-2">
            <span className="text-xl">🚚</span>
          </div>
          <h2 className="text-lg font-bold text-white mb-1">실전 배차 필터 셋업</h2>
          <p className="text-xs text-[#bacbb9] text-center px-2 leading-relaxed">
            자신만의 오더 컷(Cut) 조건을 설정하세요.<br />조건에 미달하는 똥콜은 스스로 거르셔야 합니다.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5">
          
          <div className="flex gap-4">
            {/* 현위치 */}
            <label className="flex-1 flex flex-col gap-2">
              <span className="text-xs font-bold text-[#88d899]">1. 현재 거점 (시작)</span>
              <select
                id="locSelect"
                value={currentLocCode}
                onChange={(e) => setCurrentLocCode(e.target.value)}
                className="bg-[#152031] text-white border border-[#2a3548] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#75ff9e] transition-all appearance-none"
              >
                <RegionOptions />
              </select>
            </label>

            {/* 목표 하차 존 */}
            <label className="flex-1 flex flex-col gap-2">
              <span className="text-xs font-bold text-[#88d899]">2. 목표 하차 존</span>
              <select
                id="destSelect"
                value={selectedDestCode}
                onChange={(e) => setSelectedDestCode(e.target.value)}
                className="bg-[#152031] text-white border border-[#2a3548] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#75ff9e] transition-all appearance-none"
              >
                <RegionOptions />
              </select>
            </label>
          </div>

          <div className="h-px bg-[#2a3548] my-1" />

          {/* 상차 거리 */}
          <label className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-[#facc15]">3. 상차지 접근 한도 (공차)</span>
              <span className="text-sm font-bold text-white">{maxPickupDistance} km</span>
            </div>
            <input 
              type="range" min="1" max="50" step="1" 
              value={maxPickupDistance} 
              onChange={(e) => setMaxPickupDistance(Number(e.target.value))} 
              className="accent-[#facc15] h-1.5 bg-[#152031] rounded-lg appearance-none cursor-pointer" 
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-[-4px]">
              <span>1km</span>
              <span>50km</span>
            </div>
          </label>

          {/* 최소 요금 */}
          <label className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-[#ffba79]">4. 최소 요금 하한선</span>
              <span className="text-sm font-bold text-white">{(minFare / 10000).toFixed(1)} 만원</span>
            </div>
            <input 
              type="range" min="10000" max="100000" step="5000" 
              value={minFare} 
              onChange={(e) => setMinFare(Number(e.target.value))} 
              className="accent-[#ffba79] h-1.5 bg-[#152031] rounded-lg appearance-none cursor-pointer" 
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-[-4px]">
              <span>1만원</span>
              <span>10만원</span>
            </div>
          </label>

        </div>

        {/* Action */}
        <div className="p-4 bg-[#111c2d] border-t border-[#2a3548]">
          <button
            onClick={handleStart}
            className="w-full py-3 bg-[#75ff9e] hover:bg-[#00e676] text-[#003918] rounded-xl font-bold shadow-[0_0_15px_rgba(117,255,158,0.2)] transition-all active:scale-[0.98]"
          >
            기사 운행 시작
          </button>
        </div>
      </div>
    </div>
  );
};
