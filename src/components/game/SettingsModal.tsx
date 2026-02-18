import { useRef, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal = ({ onClose }: SettingsModalProps) => {
  const {
    fontSize, setFontSize,
    currentLevel, setCurrentLevel,
    theme, setTheme,
    viewOptions, setViewOptions
  } = useSettings();
  const modalRef = useRef<HTMLDivElement>(null); // modalRef is no longer directly used for click outside, as Modal component handles it. Keeping it for now as it was not explicitly removed.

  useEffect(() => {
    // This useEffect for handleClickOutside is likely redundant if Modal component handles it.
    // However, the instruction was to refactor the contents, not remove existing logic outside the return.
    // If Modal handles click outside, this can be removed. For now, keeping it as per strict instruction interpretation.
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <Modal isOpen={true} onClose={onClose} title="환경 설정" footer={
      <Button onClick={onClose} className="w-full">
        설정 적용
      </Button>
    }>
      <div className="space-y-8 py-2">
        <div>
          <label className="text-sm font-bold text-slate-300 block mb-4 uppercase tracking-wider">화면 테마</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme('tactical')}
              className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${theme === 'tactical'
                ? 'bg-green-900/20 border-green-500 text-green-400 shadow-[0_0_10px_rgba(22,163,74,0.3)]'
                : 'bg-black/20 border-white/10 text-slate-500 hover:bg-white/5 hover:text-slate-300'
                }`}
            >
              <span className="font-bold text-xs uppercase tracking-widest">전술 작전 모드</span>
              <span className="text-[10px] opacity-60">어두운 화면 / 고대비</span>
            </button>
            <button
              onClick={() => setTheme('kids')}
              className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${theme === 'kids'
                ? 'bg-blue-100 border-blue-500 text-blue-600 shadow-md'
                : 'bg-black/20 border-white/10 text-slate-500 hover:bg-white/5 hover:text-slate-300'
                }`}
            >
              <span className="font-bold text-xs uppercase tracking-widest">어린이 탐험 모드</span>
              <span className="text-[10px] opacity-60">밝은 화면 / 귀여운 느낌</span>
            </button>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">글자 크기 조절</label>
            <span className="text-sm text-green-400 font-mono font-bold">{fontSize.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={fontSize}
            onChange={(e) => setFontSize(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono uppercase tracking-widest">
            <span>작게</span>
            <span>보통</span>
            <span>크게</span>
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-slate-300 block mb-4 uppercase tracking-wider">화면 표시 옵션</label>
          <div className="space-y-3 bg-black/20 p-4 rounded-lg border border-white/5">

            {/* Layer Control Toggle */}
            <div
              className="flex items-center justify-between cursor-pointer group"
              onClick={() => setViewOptions({ ...viewOptions, showLayerControl: !viewOptions.showLayerControl })}
            >
              <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">레이어 조절 버튼</span>
              <div className="relative w-10 h-5">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={viewOptions.showLayerControl}
                  readOnly
                />
                <div className={`absolute inset-0 rounded-full transition-colors duration-200 ${viewOptions.showLayerControl ? 'bg-green-600' : 'bg-slate-700'}`} />
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${viewOptions.showLayerControl ? 'translate-x-6' : 'translate-x-1'} left-0`} />
              </div>
            </div>

            {/* Scale Info Toggle */}
            <div
              className="flex items-center justify-between cursor-pointer group"
              onClick={() => setViewOptions({ ...viewOptions, showScaleBar: !viewOptions.showScaleBar })}
            >
              <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">축척 및 정보</span>
              <div className="relative w-10 h-5">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={viewOptions.showScaleBar}
                  readOnly
                />
                <div className={`absolute inset-0 rounded-full transition-colors duration-200 ${viewOptions.showScaleBar ? 'bg-green-600' : 'bg-slate-700'}`} />
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${viewOptions.showScaleBar ? 'translate-x-6' : 'translate-x-1'} left-0`} />
              </div>
            </div>

            {/* Game Log Toggle */}
            <div
              className="flex items-center justify-between cursor-pointer group"
              onClick={() => setViewOptions({ ...viewOptions, showGameLog: !viewOptions.showGameLog })}
            >
              <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">게임 로그</span>
              <div className="relative w-10 h-5">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={viewOptions.showGameLog}
                  readOnly
                />
                <div className={`absolute inset-0 rounded-full transition-colors duration-200 ${viewOptions.showGameLog ? 'bg-green-600' : 'bg-slate-700'}`} />
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${viewOptions.showGameLog ? 'translate-x-6' : 'translate-x-1'} left-0`} />
              </div>
            </div>

          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-slate-300 block mb-4 uppercase tracking-wider">게임 난이도</label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => setCurrentLevel(level)}
                disabled={level > 3}
                className={`py-2 rounded text-xs font-bold transition-all border ${currentLevel === level
                  ? 'bg-green-500 text-black border-green-500 shadow-[0_0_10px_rgba(22,163,74,0.5)]'
                  : level > 3
                    ? 'bg-transparent text-slate-700 border-slate-800 cursor-not-allowed opacity-50'
                    : 'bg-transparent text-slate-500 border-slate-600 hover:border-green-500/50 hover:text-green-400'
                  }`}
              >
                LV.{level}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3 font-mono text-center">
            {currentLevel === 1 && "1단계: 위치 익히기"}
            {currentLevel === 2 && "2단계: 경로 시각화"}
            {currentLevel === 3 && "3단계: 거리 감각 익히기"}
            {currentLevel > 3 && `레벨 ${currentLevel} (잠김)`}
          </p>
        </div>
      </div>
    </Modal>
  );
};
