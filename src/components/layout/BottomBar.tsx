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
  { id: 'labels',        label: '지역 명칭' },
  { id: 'roadMotorway',  label: '고속도로' },
  { id: 'roadTrunk',     label: '국도' },
  { id: 'roadPrimary',   label: '주요도로' },
  { id: 'roadSecondary', label: '보조도로' },
  { id: 'roadOther',     label: '기타도로' },
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
      glass-header border-t border-border
      shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
    >

      {/* LEFT: Metrics + Scale */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-muted-foreground uppercase tracking-widest">확대</span>
            <span className="text-[10px] font-bold text-foreground/60">{zoom?.toFixed(2)}x</span>
          </div>
          <div className="w-px h-3.5 bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-muted-foreground uppercase tracking-widest">객체</span>
            <span className="text-[10px] font-bold text-foreground/60">{renderedCount ?? 0}</span>
          </div>
        </div>

        {/* Scale bar */}
        {width > 0 && (
          <>
            <div className="w-px h-3.5 bg-border" />
            <div className="flex items-center gap-2 opacity-50 hover:opacity-80 transition-opacity">
              <div
                className="h-[5px] border-b border-l border-r border-foreground/50"
                style={{ width: `${width}px` }}
              />
              <span className="text-[8px] font-mono text-foreground/60">{distance} {unit}</span>
            </div>
          </>
        )}
      </div>

      {/* CENTER: Hovered region */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
        {hoveredRegion ? (
          <div className="flex items-center gap-2 animate-in fade-in duration-150">
            <div className="w-1 h-1 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.8)]" />
            <span className="text-[11px] font-bold text-foreground/80 tracking-tight font-mono">
              {hoveredRegion}
            </span>
          </div>
        ) : (
          <span className="text-[9px] text-muted-foreground/40 font-mono tracking-widest uppercase">
            — 지역 없음 —
          </span>
        )}
      </div>

      {/* RIGHT: Layer Control */}
      <div className="relative flex items-center">
        {/* Upward dropdown */}
        <div className={`
          absolute bottom-full right-0 mb-2 w-44
          glass-panel !rounded-lg shadow-2xl p-2
          origin-bottom-right transition-all duration-200
          ${isLayerMenuOpen
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-1 pointer-events-none'}
        `}>
          <div className="px-2 py-1.5 border-b border-border mb-1 flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-primary/70" />
            <span className="text-[9px] font-bold font-mono text-muted-foreground tracking-widest uppercase">레이어 설정</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {LAYERS.map(({ id, label }) => (
              <div
                key={id}
                onClick={() => toggleLayer(id as any)}
                className="flex items-center justify-between cursor-pointer hover:bg-muted/50 px-2 py-1.5 rounded transition-colors"
              >
                <span className={`text-[10px] font-mono font-bold transition-colors ${
                  layerVisibility[id] ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {label}
                </span>
                {/* Toggle pill */}
                <div className="relative w-8 h-3.5">
                  <div className={`absolute inset-0 rounded-full transition-colors duration-200 ${
                    layerVisibility[id] ? 'bg-primary' : 'bg-muted'
                  }`} />
                  <div className={`absolute top-0.5 w-2.5 h-2.5 bg-primary-foreground rounded-full shadow transition-transform duration-200 ${
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
              ? 'bg-primary/15 text-primary border-primary/30'
              : 'text-muted-foreground border-border bg-muted/30 hover:text-foreground hover:bg-muted/60'
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
