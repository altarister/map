import { useGame } from '../../contexts/GameContext';
import type { CallFilterQuestion, CallItem, UserInput } from '../../game/core/types';

export const Stage2DispatchBoard = () => {
  const { gameState, currentQuestion, checkAnswer, targetDestination } = useGame();

  if (gameState !== 'PLAYING' || !currentQuestion || currentQuestion.type !== 'CALL_FILTER') {
    return null;
  }

  const question = currentQuestion as CallFilterQuestion;
  const calls = question.calls;

  const handleAccept = (call: CallItem) => {
    const input: UserInput = { type: 'OPTION_SELECT', value: call.id };
    checkAnswer(input);
  };

  const handlePass = (callId: string) => {
    // 거절 시 해당 콜 타일 UI에서 임시 제거 또는 다음 콜 생성 트리거 등 커스텀 로직 (일단 보류)
    console.log('Passed call:', callId);
  };

  return (
    <div className="absolute top-20 right-4 z-[35] w-[350px] flex flex-col gap-3 bg-[#081425] text-[#d8e3fb] p-4 rounded-lg border border-[#111c2d] shadow-2xl max-h-[80vh] overflow-y-auto font-sans">
      
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-[#111c2d] pb-3 mb-2">
        <h2 className="text-[20px] font-bold text-white tracking-tight">LIVE DISPATCH</h2>
        {targetDestination && (
          <p className="text-[#bacbb9] text-[12px] font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00e676] shadow-[0_0_8px_#00e676]" />
            목표 하차 존: <span className="text-white font-bold">{targetDestination.name}</span>
          </p>
        )}
      </div>

      {/* 실시간 콜 리스트 */}
      <div className="flex flex-col gap-3">
        {calls.map((call) => (
          <div key={call.id} className="bg-[#152031] rounded-lg p-4 flex flex-col gap-3 hover:bg-[#1f2a3c] transition-colors relative">
            
            {/* 거리 & 운임 정보 */}
            <div className="flex justify-between items-end border-b border-[#2a3548] pb-2">
              <span className="text-[#00e676] text-xl font-bold tracking-tight">
                {call.fare.toLocaleString()}원
              </span>
              <span className="text-[#bacbb9] text-xs font-mono">
                직선거리 {call.distanceKm.toFixed(1)}km
              </span>
            </div>

            {/* 상/하차지 정보 */}
            <div className="flex flex-col gap-2 my-1">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#ffba79]" /> {/* 상차 아이콘 */}
                <span className="text-sm font-medium text-white line-clamp-1">{call.startRegion.name}</span>
              </div>
              
              <div className="w-0.5 h-3 bg-[#3b4a3d] ml-1 opacity-50" /> {/* 연결선 */}

              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#75ff9e]" /> {/* 하차 아이콘 */}
                <span className="text-sm font-bold text-white line-clamp-1">{call.targetRegion.name}</span>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handlePass(call.id)}
                className="flex-1 py-2 rounded-md bg-[#111c2d] text-[#bacbb9] text-xs font-bold hover:bg-[#2a3548] transition-colors"
              >
                거 절
              </button>
              <button
                onClick={() => handleAccept(call)}
                className="flex-[2] py-2 rounded-md bg-[#75ff9e] text-[#003918] text-sm font-bold hover:bg-[#00e676] shadow-[0_0_12px_rgba(117,255,158,0.2)] transition-colors"
              >
                수 락 (배차)
              </button>
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
};
