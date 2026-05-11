import React, { useState, useEffect } from 'react';
import { useGame } from '../../../contexts/GameContext';

interface SettingsPopupProps {
  onClose: () => void;
}

const DISTANCE_OPTIONS = [
  { label: '무제한', value: 999 },
  { label: '1km', value: 1 },
  { label: '3km', value: 3 },
  { label: '5km', value: 5 },
  { label: '10km', value: 10 },
  { label: '15km', value: 15 },
  { label: '20km', value: 20 },
  { label: '30km', value: 30 },
];

export const InseongSettingsPopup: React.FC<SettingsPopupProps> = ({ onClose }) => {
  const { maxPickupDistanceKm } = useGame();
  const [selectedDistance, setSelectedDistance] = useState<number>(maxPickupDistanceKm || 10);

  useEffect(() => {
    const saved = localStorage.getItem('STAGE2_SETTINGS');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.maxPickupDistanceKm) {
          setSelectedDistance(parsed.maxPickupDistanceKm);
        }
      } catch (e) {}
    }
  }, []);

  const handleSave = () => {
    // Save to local storage
    const saved = localStorage.getItem('STAGE2_SETTINGS');
    let newSettings = { targetDestCode: 'ALL', targetDestName: '전체', minFare: 30000 };
    if (saved) {
      try {
        newSettings = JSON.parse(saved);
      } catch(e) {}
    }
    
    // Update distance
    localStorage.setItem('STAGE2_SETTINGS', JSON.stringify({
      ...newSettings,
      maxPickupDistanceKm: selectedDistance
    }));

    // In a real scenario, we might want to reload the stage or update context immediately.
    // However, since startGame handles the initialization, we'll prompt the user or handle it via a game reload.
    // For now, we just close it and it will apply on the next map click (or we can force reload).
    alert(`신규 오더 수신 반경이 ${selectedDistance === 999 ? '무제한' : `${selectedDistance}km`}으로 설정되었습니다.\n(지도에서 픽업 지역을 다시 선택하면 적용됩니다.)`);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 font-sans touch-none">
      <div className="bg-white w-full max-w-sm flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#0052a3] text-white py-3 px-4 flex justify-between items-center text-[16px] font-bold">
          <span>지도/리스트 필터 설정</span>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 bg-gray-100 flex-1 overflow-y-auto">
          <div className="bg-white border border-gray-300 p-3 mb-4">
            <label className="block text-gray-800 font-bold mb-2 border-b border-gray-200 pb-2">
              🚗 신규 오더 수신 반경 (내 위치 기준)
            </label>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {DISTANCE_OPTIONS.map((opt) => (
                 <label 
                   key={opt.value} 
                   className={`flex items-center space-x-2 p-2 border ${
                     selectedDistance === opt.value 
                       ? 'border-[#0052a3] bg-blue-50 text-[#0052a3] font-bold' 
                       : 'border-gray-300 bg-white text-gray-700'
                   } cursor-pointer hover:bg-gray-50 transition-colors`}
                 >
                   <input
                     type="radio"
                     name="pickupDistance"
                     value={opt.value}
                     checked={selectedDistance === opt.value}
                     onChange={() => setSelectedDistance(opt.value)}
                     className="w-4 h-4 text-[#0052a3]"
                   />
                   <span>{opt.label}</span>
                 </label>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 mt-2 mt-3 leading-tight">
              ※ 현 위치 반경 내에 상차지가 있는 화물만 신규 리스트에 수신됩니다.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex bg-gray-200 p-2 gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white text-gray-700 font-bold border border-gray-400 hover:bg-gray-50 transition-colors text-[15px]"
          >
            닫기
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-[#0052a3] text-white font-bold shadow-md hover:bg-blue-800 transition-colors text-[15px]"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};
