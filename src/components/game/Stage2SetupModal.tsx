import { useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useGeoContext } from '../../contexts/GeoDataContext';

export const Stage2SetupModal = () => {
  const { setTargetDestination, startGame } = useGame();
  const { filteredMapData } = useGeoContext();
  const [selectedDestCode, setSelectedDestCode] = useState<string>('41610'); // 초기 선택: 경기 광주

  const handleStart = () => {
    // 1. 목표 시군구 선택
    const destFeature = filteredMapData?.features.find(f => f.properties.code === selectedDestCode);
    if (!destFeature) return;

    setTargetDestination({
      code: destFeature.properties.code,
      name: destFeature.properties.name
    });

    // 2. Play 모드로 진입 및 콜 생성 트리거
    startGame();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#081425] w-full max-w-sm rounded-[16px] overflow-hidden border border-[#2a3548] shadow-2xl animate-fade-in-up">
        
        {/* Header */}
        <div className="p-6 bg-[#111c2d] border-b border-[#2a3548] flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[#00e676]/20 flex items-center justify-center mb-3">
            <span className="text-2xl">🎯</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">희망 노선 설정</h2>
          <p className="text-sm text-[#bacbb9] text-center px-4 leading-relaxed">
            오늘 퇴근 방향을 설정하세요.<br/>내 노선과 일치하는 화물 콜만 배차받습니다.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold text-[#88d899] uppercase tracking-wider">목표 하차 존 (시군구)</span>
            <select
              value={selectedDestCode}
              onChange={(e) => setSelectedDestCode(e.target.value)}
              className="bg-[#152031] text-white border border-[#2a3548] rounded-lg px-4 py-3 outline-none focus:border-[#75ff9e] focus:shadow-[0_0_8px_rgba(117,255,158,0.3)] transition-all font-medium appearance-none"
            >
              {/* 경기 광주, 용인, 화성 등 일부 옵션만 노출 (또는 mapData에서 추출) */}
              <option value="41610">경기 광주시</option>
              <option value="41460">경기 용인시</option>
              <option value="41590">경기 화성시</option>
              <option value="41110">경기 수원시</option>
              <option value="41130">경기 성남시</option>
            </select>
          </label>
        </div>

        {/* Action */}
        <div className="p-4 bg-[#111c2d] border-t border-[#2a3548]">
          <button
            onClick={handleStart}
            className="w-full py-3.5 bg-[#75ff9e] hover:bg-[#00e676] text-[#003918] rounded-xl font-bold shadow-[0_0_20px_rgba(117,255,158,0.2)] transition-all active:scale-[0.98]"
          >
            배차 시작
          </button>
        </div>
      </div>
    </div>
  );
};
