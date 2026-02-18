interface MapScaleProps {
  width: number;
  distance: number;
  unit: string;
  zoom?: number;
  hoveredRegion?: string | null;
  clickedRegion?: string | null; // For future use or if needed
  renderedCount?: number;
  showDebug?: boolean;
}

import { useState } from 'react';
import { useMapContext } from '../../contexts/MapContext';
import { Button } from '../ui/Button';

interface MapScaleProps {
  width: number;
  distance: number;
  unit: string;
  zoom?: number;
  hoveredRegion?: string | null;
  renderedCount?: number;
}

export const MapScale = ({
  width,
  distance,
  unit,
  zoom,
  hoveredRegion,
  renderedCount,
}: MapScaleProps) => {
  const { layerVisibility, toggleLayer } = useMapContext(); // Revert hook
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

  // Layer Definitions
  const LAYERS = [
    { id: 'labels', label: '지역 명칭' },
    { id: 'roadMotorway', label: '고속도로' },
    { id: 'roadTrunk', label: '국도' },
    { id: 'roadPrimary', label: '주요도로' },
    { id: 'roadSecondary', label: '보조도로' },
    { id: 'roadOther', label: '기타도로' },
  ] as const;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-10 bg-background/90 backdrop-blur-md border-t border-border z-[25] flex items-center justify-between px-4 select-none shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">

      {/* LEFT: Metrics & Scale */}
      <div className="flex items-center gap-6">
        {/* Zoom & Objs */}
        <div className="flex gap-4 text-[10px] font-mono text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="opacity-50 uppercase tracking-wider">Zoom</span>
            <span className="text-foreground font-bold">{zoom?.toFixed(2)}x</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="opacity-50 uppercase tracking-wider">Objs</span>
            <span className="text-foreground font-bold">{renderedCount ?? 0}</span>
          </div>
        </div>

        {/* Visual Scale Bar */}
        {width > 0 && (
          <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
            <div className="h-1.5 border-b border-l border-r border-foreground w-full" style={{ width: `${width}px` }}></div>
            <span className="text-[9px] font-mono text-foreground">{distance} {unit}</span>
          </div>
        )}
      </div>

      {/* CENTER: Hover Info */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
        {hoveredRegion ? (
          <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse" />
            <span className="text-sm font-black text-green-400 tracking-tight uppercase" style={{ textShadow: '0 0 10px rgba(34,197,94,0.3)' }}>
              {hoveredRegion}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground/30 font-mono tracking-widest uppercase">
            - No Signal -
          </span>
        )}
      </div>

      {/* RIGHT: Layer Control */}
      <div className="relative flex items-center">
        {/* Upward Dropdown Menu */}
        <div
          className={`
            absolute bottom-full right-0 mb-3 w-48
            bg-background/95 backdrop-blur-xl border border-border rounded-lg shadow-2xl p-2
            origin-bottom-right transition-all duration-200
            ${isLayerMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'}
          `}
        >
          <div className="px-2 py-1.5 border-b border-white/10 mb-1">
            <span className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">레이어 설정</span>
          </div>
          <div className="flex flex-col gap-1">

            {LAYERS.map(({ id, label }) => (
              <div
                key={id}
                onClick={() => toggleLayer(id as any)}
                className="flex items-center justify-between cursor-pointer group hover:bg-white/5 p-1.5 rounded transition-colors"
              >
                <span className={`text-[10px] font-bold tracking-tight transition-colors ${layerVisibility[id] ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {label}
                </span>
                <div className="relative w-9 h-4">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={layerVisibility[id]}
                    readOnly
                  />
                  <div className={`absolute inset-0 rounded-full transition-colors duration-200 ${layerVisibility[id] ? 'bg-primary' : 'bg-slate-700'}`} />
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${layerVisibility[id] ? 'translate-x-4' : 'translate-x-0'} left-1`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
          className={`
            h-8 px-3 gap-2 font-mono text-xs border border-transparent transition-all
            ${isLayerMenuOpen
              ? 'bg-primary/20 text-primary border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.3)]'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}
          `}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`w-4 h-4 transition-transform duration-300 ${isLayerMenuOpen ? 'rotate-180 text-primary' : ''}`}
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span className="tracking-wider font-bold">LAYERS</span>
        </Button>
      </div>
    </div>
  );
};
