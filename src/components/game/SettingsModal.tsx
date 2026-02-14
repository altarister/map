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
    showDebugInfo, setShowDebugInfo,
    showGameInfo, setShowGameInfo,
    theme, setTheme
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
    <Modal isOpen={true} onClose={onClose} title="SYSTEM CONFIGURATION" footer={
      <Button onClick={onClose} className="w-full">
        APPLY CONFIGURATION
      </Button>
    }>
      <div className="space-y-8 py-2">
        <div>
          <label className="text-sm font-bold text-slate-300 block mb-4 uppercase tracking-wider">Visual Theme</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme('tactical')}
              className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${theme === 'tactical'
                ? 'bg-green-900/20 border-green-500 text-green-400 shadow-[0_0_10px_rgba(22,163,74,0.3)]'
                : 'bg-black/20 border-white/10 text-slate-500 hover:bg-white/5 hover:text-slate-300'
                }`}
            >
              <span className="font-bold text-xs uppercase tracking-widest">Tactical OS</span>
              <span className="text-[10px] opacity-60">Dark / High Contrast</span>
            </button>
            <button
              onClick={() => setTheme('kids')}
              className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${theme === 'kids'
                ? 'bg-blue-100 border-blue-500 text-blue-600 shadow-md'
                : 'bg-black/20 border-white/10 text-slate-500 hover:bg-white/5 hover:text-slate-300'
                }`}
            >
              <span className="font-bold text-xs uppercase tracking-widest">Kids Explorer</span>
              <span className="text-[10px] opacity-60">Bright / Playful</span>
            </button>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Map Label Scale</label>
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
            <span>Compact</span>
            <span>Standard</span>
            <span>Max</span>
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-slate-300 block mb-4 uppercase tracking-wider">HUD Visibility</label>
          <div className="space-y-3 bg-black/20 p-4 rounded-lg border border-white/5">
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">Session Data (Bottom Left)</span>
              <input
                type="checkbox"
                checked={showGameInfo}
                onChange={(e) => setShowGameInfo(e.target.checked)}
                className="accent-green-500 w-4 h-4 rounded bg-slate-700 border-slate-600"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">Debug Params (Right Center)</span>
              <input
                type="checkbox"
                checked={showDebugInfo}
                onChange={(e) => setShowDebugInfo(e.target.checked)}
                className="accent-green-500 w-4 h-4 rounded bg-slate-700 border-slate-600"
              />
            </label>
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-slate-300 block mb-4 uppercase tracking-wider">Operation Level</label>
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
            {currentLevel === 1 && "Start Point: Location Familiarization"}
            {currentLevel === 2 && "Visualizing Logistics Routes"}
            {currentLevel === 3 && "Distance Estimation (km)"}
            {currentLevel > 3 && `Level ${currentLevel} (LOCKED)`}
          </p>
        </div>
      </div>
    </Modal>
  );
};
