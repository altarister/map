import React, { useMemo } from 'react';
import type { CallItem } from '../../../game/core/types';
import { RouteOptimizer } from '../../../game/stages/Stage2_Route/optimizer';
import { Navigation, DollarSign, Award } from 'lucide-react';
import * as d3Geo from 'd3-geo';

interface Stage2ResultModalProps {
  confirmedCalls: CallItem[];
  currentLocation: { code: string; name: string } | null;
  fullMapData: any[]; // RegionFeature[]
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
  // 컴포넌트 마운트 시 정산 1회 수행
  const result = useMemo(() => {
    if (!currentLocation) return null;
    // fullMapData에서 currentLocation의 centroid 조회
    const feature = fullMapData.find((f: any) => f.properties?.code === currentLocation.code);
    const centroid: [number, number] = feature ? d3Geo.geoCentroid(feature) : [0, 0];
    return RouteOptimizer.analyzeBatch(confirmedCalls, { ...currentLocation, center: centroid });
  }, [confirmedCalls, currentLocation, fullMapData]);

  if (!result) return null;

  // 랭크별 테마 색상 지정
  const rankColors = {
    'S': 'text-purple-500',
    'A': 'text-blue-500',
    'B': 'text-green-500',
    'C': 'text-orange-500',
    'F': 'text-red-500'
  };

  const ringColors = {
    'S': 'ring-purple-200',
    'A': 'ring-blue-200',
    'B': 'ring-green-200',
    'C': 'ring-orange-200',
    'F': 'ring-red-200'
  };

  const bgColors = {
    'S': 'bg-purple-50',
    'A': 'bg-blue-50',
    'B': 'bg-green-50',
    'C': 'bg-orange-50',
    'F': 'bg-red-50'
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className={`w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 ring-4 ${ringColors[result.rank]}`}>
        {/* Header */}
        <div className={`p-6 text-center ${bgColors[result.rank]} border-b border-gray-100`}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-sm mb-4">
            <span className={`text-4xl font-black ${rankColors[result.rank]}`}>
              {result.rank}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">운행 정산 완료</h2>
          <p className="text-sm font-medium text-gray-600 line-clamp-2 leading-relaxed">
            "{result.feedback}"
          </p>
        </div>

        {/* Body Stats */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3 text-gray-600">
              <DollarSign size={20} className="text-green-600" />
              <span className="font-semibold">총 운임 수익</span>
            </div>
            <span className="text-lg font-bold text-gray-900">
              {result.totalFare.toLocaleString()} 원
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3 text-gray-600">
              <Navigation size={20} className="text-blue-600" />
              <span className="font-semibold">최단 예상 이동거리</span>
            </div>
            <span className="text-lg font-bold text-gray-900">
              {result.idealDistanceKm} km
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border-l-4 border-indigo-500">
            <div className="flex items-center gap-3 text-gray-600">
              <Award size={20} className="text-indigo-600" />
              <span className="font-semibold">km당 수익률</span>
            </div>
            <span className="text-lg font-bold text-indigo-600">
              {result.profitPerKm.toLocaleString()} 원/km
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 flex gap-3">
          <button 
            onClick={onExit}
            className="flex-1 py-3 px-4 rounded-xl font-bold bg-white text-gray-700 border border-gray-200 shadow-sm transition-colors active:bg-gray-100"
          >
            그만하기
          </button>
          <button 
            onClick={onRetry}
            className="flex-1 py-3 px-4 rounded-xl font-bold bg-indigo-600 text-white shadow-md transition-opacity active:bg-indigo-700"
          >
            다시 운행하기
          </button>
        </div>
      </div>
    </div>
  );
};
