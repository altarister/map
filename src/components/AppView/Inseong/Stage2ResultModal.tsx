import React, { useMemo } from 'react';
import type { CallItem } from '../../../game/core/types';
import { RouteOptimizer } from '../../../game/stages/Stage2_Route/optimizer';
import { formatRegionName } from '../../../utils/format';
import * as d3Geo from 'd3-geo';

interface Stage2ResultModalProps {
  confirmedCalls: CallItem[];
  currentLocation: { code: string; name: string } | null;
  fullMapData: any[];
  onRetry: () => void;
  onExit: () => void;
}

export const Stage2ResultModal: React.FC<Stage2ResultModalProps> = ({
  confirmedCalls,
  currentLocation,
  fullMapData,
  onRetry,
  onExit
}) => {
  const result = useMemo(() => {
    if (!currentLocation) return null;
    const feature = fullMapData.find((f: any) => f.properties?.code === currentLocation.code);
    const centroid: [number, number] = feature ? d3Geo.geoCentroid(feature) : [0, 0];
    return RouteOptimizer.analyzeBatch(confirmedCalls, { ...currentLocation, center: centroid });
  }, [confirmedCalls, currentLocation, fullMapData]);

  if (!result) return null;

  // 랭크별 색상
  const rankTheme: Record<string, { text: string; bg: string; border: string }> = {
    'S': { text: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-400' },
    'A': { text: 'text-blue-600',   bg: 'bg-blue-100',   border: 'border-blue-400'   },
    'B': { text: 'text-green-600',  bg: 'bg-green-100',  border: 'border-green-400'  },
    'C': { text: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-400' },
    'F': { text: 'text-red-600',    bg: 'bg-red-100',    border: 'border-red-400'    },
  };
  const theme = rankTheme[result.rank] || rankTheme['C'];

  return (
    <div className="relative w-full h-full flex flex-col bg-[#eef1f6] font-sans text-black select-none tracking-tight">
      
      {/* 상단: 랭크 + 피드백 */}
      <div className={`${theme.bg} border-b-2 ${theme.border} px-3 py-3 flex items-center gap-3`}>
        <div className={`w-12 h-12 rounded-full bg-white border-2 ${theme.border} flex items-center justify-center shadow-sm shrink-0`}>
          <span className={`text-2xl font-black ${theme.text}`}>{result.rank}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] text-gray-800">운행 정산 완료</p>
          <p className="text-[12px] text-gray-600 leading-tight line-clamp-2 mt-0.5">
            {result.feedback}
          </p>
        </div>
      </div>

      {/* 점수표 요약 */}
      <div className="bg-white border-b border-gray-300 px-3 py-2 space-y-1">
        <div className="flex justify-between text-[14px]">
          <span className="text-gray-600 font-semibold">💰 총 운임</span>
          <span className="font-bold text-gray-900">{result.totalFare.toLocaleString()}원</span>
        </div>
        <div className="flex justify-between text-[14px]">
          <span className="text-gray-600 font-semibold">📍 최단 이동거리</span>
          <span className="font-bold text-gray-900">{result.idealDistanceKm} km</span>
        </div>
        <div className={`flex justify-between text-[14px] ${theme.text}`}>
          <span className="font-bold">⚡ km당 수익률</span>
          <span className="font-extrabold text-[16px]">{result.profitPerKm.toLocaleString()}원/km</span>
        </div>
      </div>

      {/* 개별 콜 평가 리스트 */}
      <div className="flex bg-[#455a64] text-white text-[12px] font-bold py-1 px-2 border-b border-gray-500">
        <div className="w-[8%] text-center">#</div>
        <div className="w-[28%] text-center">출발지</div>
        <div className="w-[28%] text-center">도착지</div>
        <div className="w-[18%] text-center">요금</div>
        <div className="w-[18%] text-center">평가</div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        {confirmedCalls.map((call, idx) => {
          const hasViolation = !!call.violation;
          const rowBg = hasViolation 
            ? 'bg-red-50' 
            : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';

          return (
            <div 
              key={call.id}
              className={`flex items-center ${rowBg} border-b border-gray-200 py-2 px-2 text-[13px]`}
            >
              <div className="w-[8%] text-center font-bold text-gray-500">{idx + 1}</div>
              <div className="w-[28%] text-center font-bold text-gray-800 truncate px-1">
                {formatRegionName(call.pickups[0].name)}
              </div>
              <div className="w-[28%] text-center font-bold text-gray-800 truncate px-1">
                {formatRegionName(call.dropoffs[0].name)}
              </div>
              <div className="w-[18%] text-center font-bold text-gray-900">
                {Math.round(call.fare / 1000)}천
              </div>
              <div className="w-[18%] text-center">
                {hasViolation ? (
                  <span className="text-red-600 font-bold text-[11px]">
                    {call.violation === 'BAD_FARE' ? '💀 저수익' : '⛔ 역방향'}
                  </span>
                ) : (
                  <span className="text-green-600 font-bold text-[11px]">✅ 양호</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 액션 버튼 */}
      <div className="bg-[#263238] px-2 py-2 flex gap-2 border-t border-gray-700 shrink-0">
        <button 
          onClick={onExit}
          className="flex-1 py-3 bg-white text-gray-800 font-extrabold text-[14px] rounded-sm shadow-sm border border-gray-400 active:scale-95 transition-transform"
        >
          그만하기
        </button>
        <button 
          onClick={onRetry}
          className="flex-1 py-3 bg-[#ffb300] text-gray-800 font-extrabold text-[14px] rounded-sm shadow-sm border-2 border-orange-400 active:scale-95 transition-transform"
        >
          다시 운행하기
        </button>
      </div>
    </div>
  );
};
