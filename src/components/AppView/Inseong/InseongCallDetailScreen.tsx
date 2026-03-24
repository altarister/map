import type { CallItem } from '../../../game/core/types';
import type { AnswerFeedback } from '../../../types/game';

interface Props {
  call: CallItem;
  feedback: AnswerFeedback | null;
  onClose: () => void;
  onAccept: (call: CallItem) => void;
  onConfirm: (call: CallItem) => void;
}

export const InseongCallDetailScreen = ({ call, feedback, onClose, onAccept, onConfirm }: Props) => {
  const isEvaluated = feedback !== null;
  const isCorrect = feedback?.isCorrect ?? false;

  const fareFormatted = call.fare.toLocaleString();
  const distPickup = call.pickupDistanceKm?.toFixed(1) || '0.0';
  const distDelivery = call.distanceKm.toFixed(1);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#eef1f6] font-sans text-black select-none tracking-tight">
      
      {/* 1. Header (Standard Blue) */}
      <div className="flex items-center justify-between h-[45px] bg-[#0052a3] px-2 shrink-0 border-b border-[#003d7a]">
        <div className="font-extrabold text-white text-base">대도-1800-1101</div>
        <div className="flex space-x-1 h-full py-1.5">
          <button className="bg-[#4caf50] px-3 flex items-center justify-center rounded-sm shadow-sm active:bg-[#388e3c]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56M15.78 14.16l-2.03 2.03C10.63 14.6 8.4 12.38 6.8 9.24l2.03-2.03M4.61 8.62C4.24 7.51 4.04 6.32 4.04 5.09M20.01 15.38c.55 0 1 .45 1 1v3.58c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1H7.6c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57M15.78 14.16c.39.39.39 1.02 0 1.41M6.8 9.24c-.39-.39-1.02-.39-1.41 0" stroke="white" strokeWidth="2" fill="none"/></svg>
          </button>
          <button className="bg-[#e0e0e0] text-gray-800 px-3 font-bold text-sm rounded-sm shadow-sm active:bg-[#bdbdbd]">완료</button>
        </div>
      </div>

      {isEvaluated && !isCorrect && (
        <div className="bg-[#d90000] text-white text-center font-bold py-1.5 px-2 text-[15px] shadow-sm shrink-0">
          ❌ 오답 사유: {feedback.message}
        </div>
      )}

      {/* Info Area Base */}
      <div className="flex-1 overflow-y-auto bg-white">
        
        {/* 2. Status & Vehicle */}
        <div className="bg-white flex flex-col pt-2 pb-2 px-3 border-b border-gray-200">
          <div className="flex justify-between items-center mb-2 mt-1">
            <div className="flex gap-5 text-sm font-bold text-gray-500">
              <span>상태 : <span className="text-gray-900 ml-1">배차</span></span>
              <span>물품 : <span className="text-gray-900 ml-1"></span></span>
            </div>
            <button onClick={onClose} className="px-4 py-1.5 bg-white border border-gray-400 font-bold text-xs rounded text-gray-800 shadow-sm active:bg-gray-100">
              취소
            </button>
          </div>
          <div className="flex gap-5 text-sm font-bold text-gray-500 mb-1">
            <span>차량 : <span className="text-[#0052a3] ml-1">{call.vehicleType || '오토'}</span></span>
            <span>탁송료 : <span className="text-gray-900 ml-1">0</span></span>
          </div>
        </div>

        {/* 3. Fare & Type */}
        <div className="bg-[#f8f9fa] flex flex-col px-3 py-4 border-b border-gray-200">
          <div className="font-extrabold text-2xl text-[#d90000] tracking-tighter mb-1">
            요금 : {fareFormatted}({call.paymentMethod || '선불'})
          </div>
          {/* <div className="text-[13px] font-bold text-gray-500 mb-2">#퀵서비스</div>
          <div className="text-[12px] text-gray-400 mb-3 truncate">배차 식별번호 : {call.id}</div> */}
          
        </div>
        
        {/* ?.  */}
        <div className="flex bg-white p-3 gap-2 border-b border-gray-200">
          <div className="flex gap-8 text-sm font-bold text-gray-500">
            <span>구분 : <span className="text-gray-900 ml-1">{call.callCategory || '보통'}</span></span>
            <span>형태 : <span className="text-gray-900 ml-1">편도</span></span>
          </div>
        </div>

        {/* 4. Details & Distances Box */}
        <div className="flex bg-white p-3 gap-2 h-[100px] border-b border-gray-200">
          {/* Left buttons */}
          <div className="flex flex-col gap-1.5 w-[85px] shrink-0">
            <button className="flex-1 bg-white border border-gray-300 rounded shadow-sm flex items-center justify-center font-bold text-[13px] text-gray-700 active:bg-gray-50">
              적요상세
            </button>
          </div>
          {/* Right Dark Box */}
          <div className="flex-1 bg-[#2b3543] text-white rounded p-2 flex flex-col justify-center gap-1 shadow-inner border border-gray-800">
            <div className="text-[#ffeb3b] font-bold text-sm tracking-tight">{call.itemDescription || '박스 1개'}</div>
            <div className="font-bold text-[13px] tracking-tight text-gray-200">현위치 ➔ 상차지(직선) {distPickup} KM</div>
            <div className="font-bold text-[13px] tracking-tight text-gray-200">상차지 ➔ 하차지(직선) {distDelivery} KM</div>
          </div>
        </div>

        {/* 5. Addresses */}
        <div className="flex flex-col gap-2.5 p-3 bg-white pb-6">
          
          <div className="flex items-stretch gap-2 h-11">
            <div className="w-[60px] bg-[#e3f2fd] border border-[#90caf9] rounded-sm flex items-center justify-center font-bold text-xs text-[#0052a3] shadow-sm shrink-0">
              의뢰지
            </div>
            <div className="w-[45px] bg-[#ff8f00] border border-[#e65100] rounded-sm flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0">
              픽업
            </div>
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-sm flex items-center px-2 font-bold text-[15px] text-gray-900 shadow-sm truncate">
              *****
            </div>
          </div>

          <div className="flex items-stretch gap-2 h-11">
            <div className="w-[60px] bg-[#e3f2fd] border border-[#90caf9] rounded-sm flex items-center justify-center font-bold text-xs text-[#0052a3] shadow-sm shrink-0">
              출발지
            </div>
            <div className="w-[45px] bg-[#ff8f00] border border-[#e65100] rounded-sm flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0">
              서명
            </div>
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-sm flex items-center px-2 font-bold text-[15px] text-gray-900 shadow-sm truncate">
              ***** / {call.startRegion.fullName}
            </div>
          </div>

          <div className="flex items-stretch gap-2 h-11">
            <div className="w-[60px] bg-[#e3f2fd] border border-[#90caf9] rounded-sm flex items-center justify-center font-bold text-xs text-[#0052a3] shadow-sm shrink-0">
              도착지
            </div>
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-sm flex items-center px-2 font-bold text-[15px] text-gray-900 shadow-sm truncate">
              {call.targetRegion.fullName}
            </div>
          </div>

        </div>

      </div>

      {/* 6. Bottom Action Bar (Floating) */}
      <div className="h-[60px] bg-[#f8f9fa] px-3 flex gap-2 items-center justify-between border-t border-gray-300 shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {(isEvaluated && isCorrect) ? (
          <button 
            onClick={() => onConfirm(call)}
            className="flex-1 h-11 bg-[#1e88e5] text-white font-extrabold text-base rounded shadow-sm border border-[#1565c0] active:scale-95 transition-transform"
          >
            확정(6) 완료
          </button>
        ) : (
          <button 
            disabled
            className="flex-1 h-11 bg-[#1e88e5] text-white font-extrabold text-base rounded shadow-sm border border-[#1565c0] opacity-30 cursor-not-allowed"
          >
            확정(6)
          </button>
        )}

        <button 
          onClick={onClose}
          className="flex-1 h-11 bg-white text-gray-800 font-extrabold text-base rounded shadow-sm border border-gray-400 active:scale-95 transition-transform"
        >
          취소
        </button>

        {!isEvaluated ? (
          <button 
            onClick={() => onAccept(call)}
            className="flex-1 h-12 bg-[#ff8f00] text-white font-extrabold text-[19px] rounded shadow-sm border border-[#e65100] active:scale-95 transition-transform flex items-center justify-center"
          >
            탁송
          </button>
        ) : (
          <button 
            disabled
            className="flex-1 h-12 bg-[#ff8f00] text-white font-extrabold text-[19px] rounded shadow-sm border border-[#e65100] opacity-30 cursor-not-allowed flex items-center justify-center"
          >
            탁송
          </button>
        )}
      </div>

    </div>
  );
};
