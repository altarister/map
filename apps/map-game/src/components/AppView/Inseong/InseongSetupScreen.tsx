import { useState } from 'react';
import { useGame } from '../../../contexts/GameContext';
import type { AutoDispatchFilter } from '../../../game/core/types';

interface Props {
  onClose?: () => void;
}

export const InseongSetupScreen = ({ onClose }: Props) => {
  const { 
    currentLocation, 
    maxPickupDistanceKm,
    minFare,
    startGame
  } = useGame();
  
  const savedSettings = localStorage.getItem('STAGE2_AUTO_DISPATCH');
  const parsed: AutoDispatchFilter | null = savedSettings ? JSON.parse(savedSettings) : null;

  const [filter, setFilter] = useState<AutoDispatchFilter>({
    allowWaypoint: parsed?.allowWaypoint ?? true,
    allowRoundTrip: parsed?.allowRoundTrip ?? true,
    pickupRadiusKm: parsed?.pickupRadiusKm ?? maxPickupDistanceKm ?? 8,
    minFare: parsed?.minFare ?? minFare ?? 40000,
    maxFare: parsed?.maxFare ?? 2000000000,
    excludedKeywords: parsed?.excludedKeywords ?? '냉장,냉동,리프트,냉차,냉탑,',
    destinationKeywords: parsed?.destinationKeywords ?? '광주,이천,여주,안성경안,곤지암,광남,남종,남한산성,도척,',
    customFilters: parsed?.customFilters ?? ['^^,@,', '김포,인천,부천,시흥,광명,안산']
  });

  const updateFilter = (key: keyof AutoDispatchFilter, value: any) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  };

  const handleCustomFilterChange = (index: number, value: string) => {
    const newFilters = [...filter.customFilters];
    newFilters[index] = value;
    updateFilter('customFilters', newFilters);
  };

  const handleSaveAndClose = () => {
    localStorage.setItem('STAGE2_AUTO_DISPATCH', JSON.stringify(filter));

    // 실제로는 keywords 파싱해서 targetDestCode 찾거나, 단순히 필터 객체를 컨텍스트에 넘겨야 함.
    startGame({
      currentLocCode: currentLocation?.code,
      currentLocName: currentLocation?.name,
      targetDestCode: 'ALL', // 임시 호환성값
      targetDestName: '사용자 지정 키워드',
      maxPickupDistanceKm: filter.pickupRadiusKm,
      minFare: filter.minFare,
      autoDispatchFilter: filter // 텍스트 필터 및 기타 옵션을 generator 로 넘김
    }, true);

    if (onClose) onClose();
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black font-sans text-white select-none">
      
      {/* 1. Header */}
      <div className="flex items-center px-3 py-3 shrink-0 relative">
        <button className="bg-[#e0e0e0] text-black text-[13px] font-bold px-3 py-1.5 rounded-sm shadow-sm absolute left-3">
          이용방법
        </button>
        <div className="flex-1 text-center font-bold text-[17px]">
          자동배차 설정
        </div>
      </div>

      {/* 2. Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-4 pb-20">
        
        {/* Checkboxes */}
        <div className="flex justify-between mt-2 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <div className={`w-7 h-7 flex items-center justify-center border ${filter.allowWaypoint ? 'bg-[#689f38] border-[#33691e]' : 'bg-transparent border-gray-400'}`}>
              {filter.allowWaypoint && <span className="text-white text-lg font-bold">✓</span>}
            </div>
            <span className="text-[16px] font-bold">경유</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer w-[50%]">
            <div className={`w-7 h-7 flex items-center justify-center border ${filter.allowRoundTrip ? 'bg-[#689f38] border-[#33691e]' : 'bg-transparent border-gray-400'}`}>
              {filter.allowRoundTrip && <span className="text-white text-lg font-bold">✓</span>}
            </div>
            <span className="text-[16px] font-bold">왕복</span>
          </label>
        </div>

        {/* 내위치 반경 */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[16px] font-bold tracking-tight">내위치 반경</span>
          <select 
            className="bg-[#e0e0e0] text-black font-bold text-[15px] px-2 py-1.5 rounded-sm w-[110px] outline-none"
            value={filter.pickupRadiusKm}
            onChange={(e) => updateFilter('pickupRadiusKm', Number(e.target.value))}
          >
            {[1, 3, 5, 8, 10, 15, 20, 30, 50].map(k => (
              <option key={k} value={k}>{k}km</option>
            ))}
          </select>
        </div>
        <div className="text-[#d32f2f] text-[13px] font-bold mb-4 tracking-tighter">
          내위치 반경을 선택해주세요.(거리로 자동배차 가능)
        </div>

        {/* 금액 */}
        <div className="mb-1">
          <div className="text-[16px] font-bold tracking-tight">금액</div>
          <div className="text-[#d32f2f] text-[13px] font-bold mb-1 tracking-tighter">
            (자동배차 받으실 금액 범위를 지정 하세요.)
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              className="flex-1 bg-white text-black font-bold px-3 py-2 text-[16px] outline-none rounded-sm border-2 border-orange-400"
              value={filter.minFare}
              onChange={(e) => updateFilter('minFare', Number(e.target.value))}
            />
            <span className="font-bold text-gray-300">~</span>
            <input 
              type="number" 
              className="flex-1 bg-white text-black font-bold px-3 py-2 text-[16px] outline-none rounded-sm"
              value={filter.maxFare}
              onChange={(e) => updateFilter('maxFare', Number(e.target.value))}
            />
          </div>
        </div>

        <div className="w-full h-[1px] bg-gray-600 my-4" />

        {/* 제외지 */}
        <div className="mb-4">
          <div className="text-[16px] font-bold tracking-tight">제외지</div>
          <div className="text-[#d32f2f] text-[13px] font-bold mb-1 tracking-tighter">
            여러단어 입력은 띄어쓰기 및 ','로 구분 합니다.
          </div>
          <textarea 
            className="w-full h-[50px] bg-white text-black font-bold p-2 text-[15px] outline-none rounded-sm resize-none"
            value={filter.excludedKeywords}
            onChange={(e) => updateFilter('excludedKeywords', e.target.value)}
          />
        </div>

        {/* 도착지 */}
        <div className="mb-4">
          <div className="text-[16px] font-bold tracking-tight">도착지</div>
          <div className="text-[#d32f2f] text-[13px] font-bold mb-1 tracking-tighter">
            두글자 이상 단어만 인식 합니다.(최대300개까지)
          </div>
          <textarea 
            className="w-full h-[60px] bg-white text-black font-bold p-2 text-[15px] outline-none rounded-sm resize-none"
            value={filter.destinationKeywords}
            onChange={(e) => updateFilter('destinationKeywords', e.target.value)}
          />
        </div>

        {/* Custom Input 1 */}
        <div className="flex gap-2 mb-2 items-stretch h-[60px]">
          <div className="w-[45px] bg-[#e0e0e0] text-black flex items-center justify-center text-[13px] font-bold shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]">
            사용
          </div>
          <textarea 
            className="flex-1 bg-white text-black font-bold p-1 line-clamp-2 border-2 border-transparent resize-none text-[14px]"
            value={filter.customFilters[0]}
            onChange={(e) => handleCustomFilterChange(0, e.target.value)}
          />
          <div className="flex flex-col gap-1 shrink-0 w-[45px]">
            <button className="flex-1 bg-[#e0e0e0] text-black text-[12px] font-bold tracking-tighter shadow-sm border border-gray-400">저장</button>
            <button className="flex-1 bg-[#e0e0e0] text-black text-[12px] font-bold tracking-tighter shadow-sm border border-gray-400 leading-none">구설<br/>정</button>
          </div>
        </div>

        {/* Custom Input 2 */}
        <div className="flex gap-2 mb-4 items-stretch h-[100px]">
          <div className="w-[45px] bg-[#e0e0e0] text-black flex items-center justify-center text-[13px] font-bold shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]">
            사용
          </div>
          <textarea 
            className="flex-1 bg-white text-black font-bold p-1 border-2 border-transparent resize-none text-[14px]"
            value={filter.customFilters[1]}
            onChange={(e) => handleCustomFilterChange(1, e.target.value)}
          />
          <div className="flex flex-col gap-1 shrink-0 w-[45px] h-[60px]">
            <button className="flex-1 bg-[#e0e0e0] text-black text-[12px] font-bold tracking-tighter shadow-sm border border-gray-400">저장</button>
            <button className="flex-1 bg-[#e0e0e0] text-black text-[12px] font-bold tracking-tighter shadow-sm border border-gray-400 leading-none">구설<br/>정</button>
          </div>
        </div>

      </div>

      {/* Bottom Floating Bar */}
      <div className="absolute bottom-0 w-full h-[60px] overflow-hidden flex flex-col justify-end border-t border-[#80deea]">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-white opacity-80 shadow-[0_0_8px_white]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#283593] via-[#4f83b6] to-transparent opacity-95"></div>
        <div className="relative z-10 w-full flex justify-center pb-2 pt-1 h-full items-center">
          <button 
            onClick={handleSaveAndClose}
            className="flex flex-col items-center text-white"
          >
            <span className="text-[18px] font-medium tracking-widest text-[#e1f5fe] shadow-black drop-shadow-md">닫기</span>
            {/* 임시 아이콘 */}
            <div className="w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center border border-white mt-0.5">
               <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          </button>
        </div>
      </div>

    </div>
  );
};
