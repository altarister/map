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
  // 채점 진행 전이냐 후냐에 따라 다르게 표시
  const isEvaluated = feedback !== null;
  const isCorrect = feedback?.isCorrect ?? false;

  return (
    <div className="relative w-full h-full flex flex-col bg-[#eef1f6] font-sans tracking-tight text-black select-none">
      
      {/* 상단 파란색 헤더 */}
      <div className={`flex items-center h-12 px-2 border-b-2 shadow-sm shrink-0 ${isEvaluated ? (isCorrect ? 'bg-[#0052a3] border-[#0052a3] text-white' : 'bg-[#d90000] border-[#d90000] text-white') : 'bg-[#0052a3] border-slate-500 text-white'}`}>
        <button onClick={onClose} className="text-white text-2xl px-2 font-bold mb-1 active:scale-95">‹</button>
        <div className="flex-1 text-center font-extrabold text-[17px]">
          {isEvaluated ? (isCorrect ? '오더 상세 (배차 완료)' : '오더 상세 (배차 실패)') : '배차 신청장'}
        </div>
        <button className="text-white text-xl px-2 opacity-0">↻</button>
      </div>

      {/* 채점 완료 시 나타나는 Feedback Banner */}
      {isEvaluated && (
        <div className={`px-4 py-3 text-center font-bold text-[15px] border-b border-gray-300 shadow-sm ${isCorrect ? 'bg-[#e8f5e9] text-green-800' : 'bg-[#ffebee] text-[#d90000]'}`}>
          {isCorrect ? '✅ 성공적으로 콜이 배차되었습니다.' : `❌ ${feedback.message}`}
        </div>
      )}

      {/* Info Rows (Scrollable Base) */}
      <div className="flex-1 overflow-y-auto bg-white flex flex-col pt-2 pb-16">
        
        {/* 요금표 크게 */}
        <div className="px-5 py-6 flex flex-col items-center justify-center border-b border-gray-300 bg-[#f8f9fa] shadow-inner font-sans">
           <span className="font-bold text-gray-500 text-sm mb-1">총 결제 운임 (수수료 포함)</span>
           <span className="text-4xl font-extrabold tracking-tighter text-[#0052a3]">{call.fare.toLocaleString()} <span className="text-2xl font-bold text-gray-700">원</span></span>
           <div className="mt-3 flex gap-2">
              <span className="bg-gray-200 px-2 py-0.5 text-xs font-bold rounded text-gray-700">카드결제</span>
              <span className="bg-blue-100 border border-blue-300 px-2 py-0.5 text-xs font-bold rounded text-blue-800">빠른입금</span>
           </div>
        </div>

        {/* 상/하차지 정보 */}
        <div className="flex flex-col border-b border-gray-300">
          <div className="flex items-stretch border-b border-gray-200">
            <div className="w-20 bg-[#f5f5dc] flex items-center justify-center border-r border-gray-300 font-bold text-sm text-gray-700">상차지</div>
            <div className="flex-1 py-3 px-3 flex flex-col">
              <span className="font-extrabold text-[16px] text-gray-900 leading-tight">{call.startRegion.name}</span>
              <span className="text-[13px] font-bold text-gray-500 mt-1">현위치 ➜ 상차지(직선) {call.pickupDistanceKm?.toFixed(1) || '0.0'} km</span>
            </div>
          </div>
          <div className="flex items-stretch">
            <div className="w-20 bg-[#f5f5dc] flex items-center justify-center border-r border-gray-300 font-bold text-sm text-gray-700">하차지</div>
            <div className="flex-1 py-3 px-3 flex flex-col">
              <span className="font-extrabold text-[16px] text-gray-900 leading-tight">{call.targetRegion.name}</span>
              <span className="text-[13px] font-bold text-gray-500 mt-1">상차지 ➜ 하차지(직선) {call.distanceKm.toFixed(1)} km</span>
            </div>
          </div>
        </div>

        {/* 오더 기타 상세 정보 표 */}
        <div className="flex flex-col border-b border-gray-300 mt-2 border-t">
           {/* ... 기타 UI 유지 ... */}
           <div className="flex border-b border-gray-200">
             <div className="w-[50%] flex">
               <div className="w-20 bg-[#f5f5dc] flex items-center justify-center border-r border-gray-300 font-bold text-xs text-gray-600">차종</div>
               <div className="flex-1 flex items-center px-3 py-2 font-bold text-sm">오토바 / 카고</div>
             </div>
             <div className="w-[50%] flex border-l border-gray-300">
               <div className="w-20 bg-[#f5f5dc] flex items-center justify-center border-r border-gray-300 font-bold text-xs text-gray-600">적재물</div>
               <div className="flex-1 flex items-center px-3 py-2 font-bold text-sm truncate">박스 1개</div>
             </div>
           </div>
        </div>

        {isEvaluated && call.violation && (
            <div className="m-4 p-3 bg-red-50 border-2 border-red-400 rounded-md">
              <div className="font-extrabold text-red-800 text-sm mb-1">통과 실패 사유:</div>
              <div className="text-red-700 font-bold text-sm leading-tight">
                {call.violation === 'BAD_FARE' ? '- 최소 허용 단가 미달 (설정 단가보다 낮음)' : '- 회원님의 희망 도착지(퇴근 방향) 존을 벗어났습니다.'}
              </div>
            </div>
        )}
      </div>

      {/* 하단 플로팅 버튼바 로직 */}
      <div className="absolute bottom-0 w-full p-2 bg-[#f8f9fa] border-t-2 border-slate-400 shadow-[0_-5px_15px_rgba(0,0,0,0.1)] flex gap-2">
        {!isEvaluated ? (
          /* 채점 전 (단순 조회 상세 페이지) */
          <>
            <button 
              onClick={onClose}
              className="flex-1 bg-white text-gray-800 active:bg-gray-100 font-bold text-lg py-3 rounded border border-gray-400 shadow-sm transition-colors"
            >
              취소
            </button>
            <button 
              onClick={() => onAccept(call)}
              className="flex-[2] bg-[#ff8f00] text-white active:bg-orange-600 font-extrabold text-lg py-3 rounded border border-orange-900 shadow-sm transition-colors"
            >
              탁송
            </button>
          </>
        ) : isCorrect ? (
          /* 채점 결과: 정답 (콜 획득 성공) */
          <>
            <button 
              onClick={() => onConfirm(call)}
              className="flex-[2] bg-[#1e88e5] text-white active:bg-blue-700 font-extrabold text-lg flex items-center justify-center gap-1 py-3 rounded border border-blue-900 shadow-sm transition-colors"
            >
              <span className="text-[13px] bg-[#0d47a1] bg-opacity-40 px-1.5 py-0.5 rounded mr-1">배차완료</span>
              확정
            </button>
            <button 
              onClick={onClose}
              className="flex-1 bg-white text-gray-800 active:bg-gray-100 font-bold text-lg py-3 rounded border border-gray-400 shadow-sm transition-colors"
            >
              취소
            </button>
          </>
        ) : (
          /* 채점 결과: 오답 (경고) */
          <button 
            onClick={onClose}
            className="w-full bg-[#d90000] text-white active:bg-red-800 font-bold text-lg py-3 rounded border border-red-900 shadow-sm transition-colors"
          >
            뒤로가기
          </button>
        )}
      </div>
    </div>
  );
};
