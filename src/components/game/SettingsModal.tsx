import { useRef, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal = ({ onClose }: SettingsModalProps) => {
  const { fontSize, setFontSize, currentLevel, setCurrentLevel } = useSettings();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div 
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">설정</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-slate-700">지도 글자 크기</label>
              <span className="text-sm text-indigo-600 font-bold">{fontSize.toFixed(1)}x</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="2.0" 
              step="0.1" 
              value={fontSize} 
              onChange={(e) => setFontSize(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>작게</span>
              <span>표준</span>
              <span>크게</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2">게임 단계</label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setCurrentLevel(level)}
                  disabled={level > 3} // 1, 2, 3단계 구현됨
                  className={`py-2 rounded-lg text-sm font-bold transition-all ${
                    currentLevel === level
                      ? 'bg-indigo-600 text-white shadow-md'
                      : level > 3
                        ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {currentLevel === 1 && "1단계: 지역 위치 익히기"}
              {currentLevel === 2 && "2단계: 상/하차 경로 시각화"}
              {currentLevel === 3 && "3단계: 거리 추정 (km)"}
              {currentLevel > 3 && `${currentLevel}단계: (준비중)`}
            </p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
