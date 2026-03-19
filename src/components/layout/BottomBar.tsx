/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useMapContext } from '../../contexts/MapContext';

interface BottomBarProps {
  width: number;
  distance: number;
  unit: string;
  zoom?: number;
  hoveredRegion?: string | null;
  renderedCount?: number;
  showDebug?: boolean;
}

const LAYERS = [
  { id: 'labels',       label: '지역 명칭' },
  { id: 'roadMotorway', label: '고속도로' },
  { id: 'roadTrunk',    label: '국도' },
  { id: 'roadPrimary',  label: '주요도로' },
  { id: 'roadSecondary',label: '보조도로' },
  { id: 'roadOther',    label: '기타도로' },
] as const;

export const BottomBar = ({
  width,
  distance,
  unit,
  zoom,
  hoveredRegion,
  renderedCount,
}: BottomBarProps) => {
  const { layerVisibility, toggleLayer } = useMapContext();
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(true);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-9 z-[25] flex items-center justify-between px-4 select-none
      bg-[#06060a]/95 backdrop-blur-xl
      border-t border-white/[0.06]
      shadow-[0_-1px_0_rgba(255,255,255,0.03),0_-4px_24px_rgba(0,0,0,0.5)]"
    >

      {/* LEFT: Metrics + Scale */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-white/25 uppercase tracking-widest">확대</span>
            <span className="text-[10px] font-bold text-white/50">{zoom?.toFixed(2)}x</span>
          </div>
          <div className="w-px h-3.5 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-white/25 uppercase tracking-widest">객체</span>
            <span className="text-[10px] font-bold text-white/50">{renderedCount ?? 0}</span>
          </div>
        </div>

        {/* Scale bar */}
        {width > 0 && (
          <>
            <div className="w-px h-3.5 bg-white/10" />
            <div className="flex items-center gap-2 opacity-40 hover:opacity-70 transition-opacity">
              <div
                className="h-[5px] border-b border-l border-r border-white/60"
                style={{ width: `${width}px` }}
              />
              <span className="text-[8px] font-mono text-white/70">{distance} {unit}</span>
            </div>
          </>
        )}
      </div>

      {/* CENTER: Hovered region */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
        {hoveredRegion ? (
          <div className="flex items-center gap-2 animate-in fade-in duration-150">
            <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="text-[11px] font-bold text-white/80 tracking-tight font-mono">
              {hoveredRegion}
            </span>
          </div>
        ) : (
          <span className="text-[9px] text-white/15 font-mono tracking-widest uppercase">
            — 지역 없음 —
          </span>
        )}
      </div>

      {/* RIGHT: Layer Control */}
      <div className="relative flex items-center">
        {/* Upward dropdown */}
        <div className={`
          absolute bottom-full right-0 mb-2 w-44
          bg-[#06060a]/98 backdrop-blur-xl
          border border-white/[0.08] rounded-lg shadow-2xl p-2
          origin-bottom-right transition-all duration-200
          ${isLayerMenuOpen
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-1 pointer-events-none'}
        `}>
          <div className="px-2 py-1.5 border-b border-white/[0.07] mb-1 flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-emerald-500/70" />
            <span className="text-[9px] font-bold font-mono text-white/40 tracking-widest uppercase">레이어 설정</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {LAYERS.map(({ id, label }) => (
              <div
                key={id}
                onClick={() => toggleLayer(id as any)}
                className="flex items-center justify-between cursor-pointer group hover:bg-white/[0.04] px-2 py-1.5 rounded transition-colors"
              >
                <span className={`text-[10px] font-mono font-bold transition-colors ${
                  layerVisibility[id] ? 'text-white/70' : 'text-white/25'
                }`}>
                  {label}
                </span>
                {/* Toggle pill */}
                <div className="relative w-8 h-3.5">
                  <div className={`absolute inset-0 rounded-full transition-colors duration-200 ${
                    layerVisibility[id] ? 'bg-emerald-500/70' : 'bg-white/10'
                  }`} />
                  <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow transition-transform duration-200 ${
                    layerVisibility[id] ? 'translate-x-[18px]' : 'translate-x-0.5'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest transition-all border ${
            isLayerMenuOpen
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'text-white/30 border-white/[0.07] bg-white/[0.03] hover:text-white/50 hover:bg-white/[0.05]'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`w-3 h-3 transition-transform duration-200 ${isLayerMenuOpen ? 'rotate-180' : ''}`}
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          LAYERS
        </button>
      </div>
    </div>
  );
};
