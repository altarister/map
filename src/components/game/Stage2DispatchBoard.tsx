import { useState, useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import type { CallFilterQuestion, CallItem, UserInput } from '../../game/core/types';

export const Stage2DispatchBoard = () => {
  const { gameState, currentQuestion, checkAnswer, targetDestination } = useGame();
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // questions가 바뀌면 선택값 초기화
  useEffect(() => {
    setSelectedCallId(null);
  }, [currentQuestion]);

  if (gameState !== 'PLAYING' || !currentQuestion || currentQuestion.type !== 'CALL_FILTER') {
    return null;
  }

  const question = currentQuestion as CallFilterQuestion;
  const calls = question.calls;

  const handleAccept = (call: CallItem) => {
    const input: UserInput = { type: 'OPTION_SELECT', value: call.id };
    checkAnswer(input);
    setSelectedCallId(null);
  };

  const handleRowClick = (callId: string) => {
    setSelectedCallId(callId);
  };

  const handleRowDoubleClick = (call: CallItem) => {
    handleAccept(call);
  };

  const handleAcceptSelected = () => {
    const call = calls.find(c => c.id === selectedCallId);
    if (call) {
      handleAccept(call);
    }
  };

  // 랜더링 도우미 포맷 함수
  const formatFare = (fare: number) => (fare / 1000).toFixed(1);

  // 단순 해시로 차종 생성 (카, 라, 다, 마 등)
  const getVehicleType = (id: string) => {
    const types = ['다', '라', '카', '마'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i);
    return types[hash % types.length];
  };

  return (
    <div className="absolute top-16 right-4 z-[35] w-[380px] flex flex-col bg-[#eef1f6] border-2 border-slate-400 shadow-2xl font-sans tracking-tight text-black select-none">
      
      {/* 상단 파란색 탭 메뉴 */}
      <div className="flex bg-[#0052a3] text-white text-sm font-bold border-b-2 border-slate-500">
        <div className="flex-1 py-1 text-center bg-[#0066cc]">신규</div>
        <div className="flex-1 py-1 text-center bg-[#0052a3]">완료</div>
        <div className="flex-1 py-1 text-center bg-[#0052a3]">게시판</div>
        <div className="flex-1 py-1 text-center bg-[#0052a3] shadow-inner text-[#00ff00]">GPS ON</div>
      </div>

      {/* 서브 툴바 */}
      <div className="flex bg-[#e4e4e4] border-b border-gray-400 text-xs text-gray-700 h-7 items-center px-1 gap-1">
        <button className="bg-[#8bd14e] text-white px-2 py-0.5 border border-gray-500 text-[10px] font-bold">원터치</button>
        <button className="bg-gray-200 px-2 py-0.5 border border-gray-400 text-[10px]">그룹공지</button>
        <button className="bg-[#facc15] text-black px-2 py-0.5 border border-gray-500 text-[10px] font-bold">잠금</button>
        <div className="flex-1" />
        <span className="text-[10px] mr-1 font-bold text-blue-800">
          목표: {targetDestination?.name || '설정안됨'}
        </span>
      </div>

      {/* 리스트 헤더 (표 모양) - 테두리 및 빨간 텍스트 */}
      <div className="flex bg-[#f5f5dc] border-b-2 border-gray-400 text-[12px] font-bold text-red-600">
        <div className="w-[12%] text-center py-1 border-r border-gray-300">거리</div>
        <div className="w-[30%] text-center py-1 border-r border-gray-300">출발지</div>
        <div className="w-[38%] text-center py-1 border-r border-gray-300">도착지</div>
        <div className="w-[10%] text-center py-1 border-r border-gray-300">차종</div>
        <div className="w-[10%] text-center py-1">요금</div>
      </div>

      {/* 콜 리스트 (표 본문) */}
      <div className="flex flex-col overflow-y-auto h-[480px] bg-white">
        {calls.length === 0 && (
           <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-lg">
             대기 중인 오더가 없습니다.
           </div>
        )}
        {calls.map((call, idx) => {
          const isSelected = selectedCallId === call.id;
          
          // Row 배색 (홀수 짝수 또는 선택 상태)
          let bgColor = idx % 2 === 0 ? 'bg-white' : 'bg-[#fcfcfa]';
          if (isSelected) bgColor = 'bg-[#899bf8] text-white'; // 선택 시 보라/파란 계열 배색

          return (
            <div 
              key={call.id} 
              className={`flex border-b border-gray-300 text-[13px] hover:bg-[#c9d3f8] cursor-pointer ${bgColor}`}
              onClick={() => handleRowClick(call.id)}
              onDoubleClick={() => handleRowDoubleClick(call)}
            >
              {/* 거리 */}
              <div className="w-[12%] py-1.5 flex justify-center items-center border-r border-gray-200 font-bold">
                {call.distanceKm.toFixed(1)}
              </div>
              
              {/* 출발지 */}
              <div className="w-[30%] px-1 py-1.5 border-r border-gray-200 truncate leading-tight">
                <span className="text-gray-500">{`@`}</span>
                <span className="font-bold ml-1">{call.startRegion.name.split(' ')[0]}</span>
              </div>
              
              {/* 도착지 */}
              <div className="w-[38%] px-1 py-1.5 border-r border-gray-200 truncate leading-tight font-bold">
                {call.targetRegion.name}
              </div>
              
              {/* 차종 */}
              <div className="w-[10%] flex justify-center items-center border-r border-gray-200">
                {getVehicleType(call.id)}
              </div>
              
              {/* 요금 */}
              <div className="w-[10%] flex justify-center items-center font-bold">
                {formatFare(call.fare)}
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 페이지네이션 및 액션 바 */}
      <div className="bg-[#e4e4e4] border-t-2 border-gray-400 p-1">
        
        {/* 페이징 컨드롤 패널 */}
        <div className="flex items-center text-xs mb-1">
          <button className="px-2 py-0.5 border border-gray-400 bg-white shadow-sm font-bold text-blue-600">◀</button>
          <span className="mx-3 font-bold">1 / 1</span>
          <button className="px-2 py-0.5 border border-gray-400 bg-white shadow-sm font-bold text-blue-600">▶</button>
          
          <div className="flex-1" />
          
          <button className="bg-[#ffb400] text-black px-3 py-0.5 mx-0.5 font-bold border border-gray-500">전체</button>
          <button className="bg-[#ffb400] text-black px-3 py-0.5 mx-0.5 font-bold border border-gray-500">리셋</button>
        </div>

        {/* 메인 액션 버튼 그룹 */}
        <div className="flex gap-1 h-9 mt-1">
           <button 
             className="bg-[#b31498] text-white flex-1 font-bold border border-gray-600 text-sm shadow opacity-80"
             disabled
           >
             ▶ 시작
           </button>
           <button 
             className="bg-[#24b1a4] text-white flex-[2] font-bold border border-gray-600 text-sm shadow"
             onClick={() => {
               // 전체 통과(거절)? 일단 보류 로직
               setSelectedCallId(null);
             }}
           >
             새로고침
           </button>
           <button 
             className={`flex-[3] font-extrabold border border-gray-600 text-sm shadow transition-all ${selectedCallId ? 'bg-[#00e676] text-black' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
             disabled={!selectedCallId}
             onClick={handleAcceptSelected}
           >
             수락 (배차)
           </button>
           <button 
             className="bg-[#1e4dc1] text-white flex-1 font-bold border border-gray-600 text-sm shadow opacity-80"
             disabled
           >
             취소
           </button>
        </div>

      </div>

    </div>
  );
};
