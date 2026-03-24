import { useEffect } from 'react';
import { useGame } from '../../../contexts/GameContext';
import type { CallFilterQuestion, CallItem } from '../../../game/core/types';

interface BoardProps {
  confirmedCalls: CallItem[];
  activeTab: 'ALL' | 'CONFIRMED';
  onTabSelect: (tab: 'ALL' | 'CONFIRMED') => void;
  onRowClick?: (call: CallItem) => void;
  onSettingsClick?: () => void;
}

export const InseongDispatchBoard = ({ confirmedCalls, activeTab, onTabSelect, onRowClick, onSettingsClick }: BoardProps) => {
  const { gameState, currentQuestion, setSelectedCallId, maxPickupDistanceKm } = useGame();

  // questions가 바뀌면 선택값 초기화
  useEffect(() => {
    if (setSelectedCallId) setSelectedCallId(null);
  }, [currentQuestion, setSelectedCallId]);

  if (gameState !== 'PLAYING' || !currentQuestion || currentQuestion.type !== 'CALL_FILTER') {
    return null;
  }

  const question = currentQuestion as CallFilterQuestion;
  // 탭에 따라 전체 콜을 보여줄지 확정(내 장부) 콜을 보여줄지 분기
  const calls = activeTab === 'ALL' ? question.calls : confirmedCalls;

  const handleRowClick = (call: CallItem) => {
    if (activeTab === 'CONFIRMED') return; // 확정 탭에서는 상세 조회 방지(원한다면 허용 가능)
    if (onRowClick) {
      onRowClick(call);
    }
  };

  // 랜더링 도우미 포맷 함수
  const formatFare = (fare: number) => (fare / 1000).toFixed(1);


  return (
    <div className="relative w-full h-full flex flex-col bg-[#eef1f6] font-sans tracking-tight text-black select-none">
      
      {/* 상단 파란색 탭 메뉴 */}
      <div className="flex bg-[#0052a3] text-white text-[15px] font-bold border-b-2 border-slate-500 cursor-pointer">
        <div 
           className={`flex-1 py-1.5 text-center transition-colors ${activeTab === 'ALL' ? 'bg-[#0066cc] border-b-4 border-[#ffb400]' : 'bg-[#0052a3]'}`}
           onClick={() => onTabSelect('ALL')}
        >
           신규
        </div>
        <div 
           className={`flex-1 py-1.5 text-center transition-colors ${activeTab === 'CONFIRMED' ? 'bg-[#0066cc] border-b-4 border-[#ffb400]' : 'bg-[#0052a3]'}`}
           onClick={() => onTabSelect('CONFIRMED')}
        >
           완료({confirmedCalls.length})
        </div>
        <div className="flex-1 py-1.5 text-center bg-[#0052a3] text-gray-300"></div>
        <div 
           className="flex-1 py-1.5 text-center bg-[#0052a3] text-gray-300 hover:text-white transition-colors"
           onClick={onSettingsClick}
        >
           설정
        </div>
      </div>

      {/* 서브 툴바 */}
      {activeTab === 'ALL' && (
        <div className="flex bg-[#e4e4e4] border-b border-gray-400 text-xs text-gray-700 h-7 items-center px-1 gap-1">
          <button className="bg-[#0052a3] text-white px-3 py-0.5 border border-gray-500 text-[10px] font-bold" onClick={onSettingsClick}>
            설정
          </button>
          <button className="bg-gray-200 px-3 py-0.5 border border-gray-400 text-[10px] font-bold text-gray-700">
            전체
          </button>
          <button className="bg-[#facc15] text-black px-3 py-0.5 border border-gray-500 text-[10px] font-bold" onClick={onSettingsClick}>
            {maxPickupDistanceKm}km
          </button>
        </div>
      )}

      {/* 리스트 헤더 (표 모양) - 테두리 및 빨간 텍스트 */}
      <div className="flex bg-[#f5f5dc] border-b-2 border-gray-400 text-[12px] font-bold text-red-600">
        <div className="w-[12%] text-center py-1 border-r border-gray-300">거리</div>
        <div className="w-[30%] text-center py-1 border-r border-gray-300">출발지</div>
        <div className="w-[38%] text-center py-1 border-r border-gray-300">도착지</div>
        <div className="w-[10%] text-center py-1 border-r border-gray-300">차종</div>
        <div className="w-[10%] text-center py-1">요금</div>
      </div>

      {/* 콜 리스트 (표 본문) */}
      <div className="flex flex-col overflow-y-auto flex-1 bg-white">
        {calls.length === 0 && (
           <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-[15px]">
             {activeTab === 'CONFIRMED' ? '아직 확정(배차 수락)된 오더가 없습니다.' : '대기 중인 오더가 없습니다.'}
           </div>
        )}
        {calls.map((call, idx) => {
          
          // Row 배색 (홀수 짝수)
          let bgColor = idx % 2 === 0 ? 'bg-white' : 'bg-[#fcfcfa]';

          return (
            <div 
              key={`${call.id}-${idx}`} 
              className={`flex border-b border-gray-300 hover:bg-[#c9d3f8] cursor-pointer ${bgColor} active:bg-[#a9bdf8]`}
              onClick={() => handleRowClick(call)}
            >
              {/* 거리 (상단: 공차거리, 하단: 운행거리) */}
              <div className="w-[12%] py-1 flex flex-col justify-center px-1 border-r border-gray-200 font-bold text-[13px] leading-[1.1]">
                <span className="text-[12px] text-gray-600 tracking-tighter">
                  {call.pickupDistanceKm?.toFixed(1) || '0.0'}
                </span>
                <span>{call.distanceKm.toFixed(1)}</span>
              </div>
              
              {/* 출발지 */}
              <div className="w-[30%] px-1 py-1 flex flex-col justify-center border-r border-gray-200 truncate leading-tight">
                <div className="flex items-start">
                  <span className="text-gray-500 text-[11px] mt-0.5">{`@`}</span>
                  <span className="font-bold ml-0.5 text-[14px] whitespace-normal line-clamp-2 leading-tight">
                    {call.startRegion.name.split(' ')[0]}
                  </span>
                </div>
              </div>
              
              {/* 도착지 */}
              <div className="w-[38%] px-1 flex flex-col justify-center border-r border-gray-200 font-bold text-[14px] leading-tight">
                {/* [TEST CODE] 개발 확인용: 정답(violation === undefined)인 경우 목적지를 붉은색으로 표시. 나중에 텍스트 색상을 기본(#0052a3)으로 복구할 것 */}
                <span className={`whitespace-normal line-clamp-2 ${call.violation === undefined ? 'text-red-600' : ''}`}>{call.targetRegion.name}</span>
              </div>
              
              {/* 차종 */}
              <div className="w-[10%] flex justify-center items-center border-r border-gray-200 text-[13px] font-bold">
                {call.vehicleType || '오토'}
              </div>
              
              {/* 요금 */}
              <div className="w-[10%] flex justify-center items-center font-bold text-[14px]">
                {formatFare(call.fare)}
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 페이지네이션 및 액션 바 (근거리가 없는 임의 버튼 제거됨) */}
      <div className="bg-[#e4e4e4] border-t-2 border-gray-400 p-1 flex justify-between items-center text-xs h-8">
         <div className="flex items-center">
            <button className="px-2 py-0.5 border border-gray-400 bg-white shadow-sm font-bold text-blue-600">◀</button>
            <span className="mx-3 font-bold">1 / 1</span>
            <button className="px-2 py-0.5 border border-gray-400 bg-white shadow-sm font-bold text-blue-600">▶</button>
         </div>
         {/* <span className="font-bold text-gray-600 mr-2 tracking-tighter">
           {activeTab === 'ALL' ? '총 1건 (현재 페이지)' : `확정 ${confirmedCalls.length}건`}
         </span> */}
         <button 
           className="bg-[#facc15] text-black px-2 py-0.5 border border-gray-500 text-[10px] font-bold hover:bg-yellow-500 transition-colors"
           onClick={onSettingsClick}
         >
           {maxPickupDistanceKm}km
         </button>
         <button className="bg-[#facc15] text-black px-2 py-0.5 border border-gray-500 text-[10px] font-bold">전체</button>
         <button className="bg-[#facc15] text-black px-2 py-0.5 border border-gray-500 text-[10px] font-bold">리셋</button>
      </div>



      <div className="flex bg-[#0052a3] text-white text-[15px] font-bold border-b-2 border-slate-500 cursor-pointer">
        <div className="flex-1 py-1.5 text-center bg-[#0052a3] text-gray-300">xxx</div>
        <div 
          className="flex-1 py-1.5 text-center text-white font-extrabold hover:bg-blue-800 transition-colors"
          onClick={onSettingsClick}
        >설정</div>
        <div className="flex-1 py-1.5 text-center bg-[#0052a3] text-gray-300">xxx</div>
      </div>
    </div>

    
    

  );
};
