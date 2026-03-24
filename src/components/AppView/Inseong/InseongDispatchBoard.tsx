import { useEffect } from 'react';
import { useGame } from '../../../contexts/GameContext';
import type { CallFilterQuestion, CallItem } from '../../../game/core/types';

interface BoardProps {
  confirmedCalls: CallItem[];
  activeTab: 'ALL' | 'CONFIRMED';
  onTabSelect: (tab: 'ALL' | 'CONFIRMED') => void;
  onRowClick: (call: CallItem) => void;
  onSettingsClick: () => void;
  isTimerPaused: boolean;
  onToggleTimer: () => void;
}

export const InseongDispatchBoard = ({ confirmedCalls, activeTab,  onTabSelect, 
  onRowClick,
  onSettingsClick,
  isTimerPaused,
  onToggleTimer
}: BoardProps) => {
  const { gameState, currentQuestion, setSelectedCallId, selectedCallId, maxPickupDistanceKm } = useGame();

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
        <div className="flex-1 py-1.5 text-center bg-[#0052a3] text-gray-300">메시지함</div>
        <div className="flex-1 py-1.5 text-center bg-[#0052a3] text-gray-300">GPS</div>
      </div>

      {/* 서브 툴바 */}
      {activeTab === 'ALL' && (
        <div className="flex bg-[#e4e4e4] border-b border-gray-400 text-xs text-gray-700 h-7 items-center px-1 gap-1">
          <button className="bg-[#0052a3] text-white px-3 py-0.5 border border-gray-500 text-[10px] font-bold" onClick={onSettingsClick}>
            원터치
          </button>
          <button className="bg-[#0052a3] text-white px-3 py-0.5 border border-gray-500 text-[10px] font-bold" onClick={onSettingsClick}>
            그룹공지
          </button>
          <button className="bg-gray-200 px-3 py-0.5 border border-gray-400 text-[10px] font-bold text-gray-700">
            장터게시판
          </button>
          <button 
            className={`px-3 py-0.5 border border-gray-400 text-[10px] font-bold ${isTimerPaused ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={onToggleTimer}
          >
            {isTimerPaused ? '잠금해제' : '잠금'}
          </button>
          <button className="bg-[#facc15] text-black px-3 py-0.5 border border-gray-500 text-[10px] font-bold" onClick={onSettingsClick}>
            빠른설정
          </button>
        </div>
      )}

      {/* 리스트 헤더 (신규 탭 전용) */}
      {activeTab === 'ALL' && (
        <div className="flex bg-white border-b-2 border-gray-400 text-center font-bold text-[12px] text-[#ff3300] py-1 shadow-sm leading-tight tracking-tighter">
          <div className="w-[12%] border-r border-gray-300">거리</div>
          <div className="w-[30%] border-r border-gray-300">출발지</div>
          <div className="w-[38%] border-r border-gray-300">도착지</div>
          <div className="w-[10%] border-r border-gray-300">차종</div>
          <div className="w-[10%]">요금</div>
        </div>
      )}

      {/* 리스트 본문 */}
      <div className="flex flex-col overflow-y-auto flex-1 bg-white">
        {calls.length === 0 && (
           <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-[15px]">
             {activeTab === 'CONFIRMED' ? '아직 확정(배차 수락)된 오더가 없습니다.' : '대기 중인 오더가 없습니다.'}
           </div>
        )}
        {calls.map((call, idx) => {
          const isSelected = selectedCallId === call.id;
          const bgColor = isSelected ? 'bg-[#c9d3f8]' : (idx % 2 === 0 ? 'bg-white' : 'bg-[#fcfcfa]');

          if (activeTab === 'CONFIRMED') {
            return (
              <div 
                key={`${call.id}-${idx}-confirmed`} 
                className={`flex items-center border-b border-gray-300 hover:bg-[#c9d3f8] cursor-pointer ${bgColor} active:bg-[#a9bdf8] py-2`}
                onClick={() => handleRowClick(call)}
              >
                <div className="w-[15%] flex justify-center">
                  <div className="border border-green-500 text-green-600 font-bold text-[11px] px-1 py-0.5 bg-white tracking-widest whitespace-nowrap">
                    완료
                  </div>
                </div>
                <div className="w-[35%] font-bold text-gray-900 text-[15px] truncate px-1 text-center tracking-tighter">
                  {call.companyName || '태양메디스'}
                </div>
                <div className="w-[15%] font-bold text-black text-[14px] text-center tracking-tighter pr-2">
                  {call.pickupTime || '12:19'}
                </div>
                <div className="w-[15%] font-bold text-black text-[14px] text-center tracking-tighter pl-2 border-l border-gray-200">
                  {call.deliveryTime || '15:46'}
                </div>
                <div className="w-[20%] font-bold text-gray-900 text-[14px] truncate pl-2 pr-2 text-right">
                  {call.targetRegion.name}
                </div>
              </div>
            );
          }

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

      {/* 하단 페이지네이션 및 액션 바 (신규 탭 전용) */}
      {activeTab === 'ALL' && (
        <div className="bg-[#e4e4e4] border-t-2 border-gray-400 p-1 flex justify-between items-center text-xs h-8">
           <div className="flex items-center">
              <button className="px-2 py-0.5 border border-gray-400 bg-white shadow-sm font-bold text-blue-600">◀</button>
              <span className="mx-3 font-bold">1 / 1</span>
              <button className="px-2 py-0.5 border border-gray-400 bg-white shadow-sm font-bold text-blue-600">▶</button>
           </div>
           <button 
             className="bg-[#facc15] text-black px-2 py-0.5 border border-gray-500 text-[10px] font-bold hover:bg-yellow-500 transition-colors"
             onClick={onSettingsClick}
           >
             {maxPickupDistanceKm}km
           </button>
           <button className="bg-[#facc15] text-black px-2 py-0.5 border border-gray-500 text-[10px] font-bold">전체</button>
           <button className="bg-[#facc15] text-black px-2 py-0.5 border border-gray-500 text-[10px] font-bold">리셋</button>
        </div>
      )}



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
