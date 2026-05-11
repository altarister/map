import { useState } from 'react';
import { LayerRoadPanel } from '../settings/LayerRoadPanel';
import { LayerMapPanel } from '../settings/LayerMapPanel';
import { useSettings } from '../../contexts/SettingsContext';

interface BottomBarProps {
  width: number;
  distance: number;
  unit: string;
  zoom?: number;
  hoveredRegion?: string | null;
  renderedCount?: number;
  showDebug?: boolean;
}

type ActivePanel = 'road' | 'map' | null;

export const BottomBar = ({
  width,
  distance,
  unit,
  zoom,
  hoveredRegion,
  renderedCount,
}: BottomBarProps) => {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const { viewOptions, setViewOptions } = useSettings();

  const toggle = (panel: ActivePanel) =>
    setActivePanel(prev => (prev === panel ? null : panel));

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

      {/* RIGHT: Layer Controls (상호 배타 두 버튼 + 광고 토글) */}
      <div className="relative flex items-center gap-1">

        {/* 광고 토글 버튼 */}
        <button
          onClick={() => setViewOptions({ ...viewOptions, showAd: !viewOptions.showAd })}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest transition-all border ${
            viewOptions.showAd
              ? 'bg-primary/15 text-primary border-primary/30'
              : 'text-muted-foreground border-border bg-muted/30 hover:text-foreground hover:bg-muted/60'
          }`}
          title={viewOptions.showAd ? "우측 광고 숨기기" : "우측 광고 표시"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="w-3 h-3"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          AD
        </button>

        {/* 구분선 */}
        <div className="w-px h-4 bg-border mx-0.5" />

        {/* 지도 레이어 패널 */}
        <div className="relative">
          <LayerMapPanel isOpen={activePanel === 'map'} />
          <button
            onClick={() => toggle('map')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest transition-all border ${
              activePanel === 'map'
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'text-muted-foreground border-border bg-muted/30 hover:text-foreground hover:bg-muted/60'
            }`}
            title="지도 레이어"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="w-3 h-3"
            >
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
            </svg>
            MAP
          </button>
        </div>

        {/* 구분선 */}
        <div className="w-px h-4 bg-border" />

        {/* 도로 레이어 패널 */}
        <div className="relative">
          <LayerRoadPanel isOpen={activePanel === 'road'} />
          <button
            onClick={() => toggle('road')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest transition-all border ${
              activePanel === 'road'
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'text-muted-foreground border-border bg-muted/30 hover:text-foreground hover:bg-muted/60'
            }`}
            title="도로 레이어"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="w-3 h-3"
            >
              <path d="M10 3L8 21M16 3l-2 18M4 8h16M3 16h18" />
            </svg>
            ROAD
          </button>
        </div>

      </div>
    </div>
  );
};
