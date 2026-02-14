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

export const MapScale = ({
  width,
  distance,
  unit,
  zoom,
  hoveredRegion,
  renderedCount,
  showDebug
}: MapScaleProps) => {
  // If no width yet (init), we might still want to show debug info if enabled, 
  // but usually scale is always calculated on mount now.

  return (
    <div className="absolute bottom-4 right-4 flex flex-col items-end pointer-events-none select-none">
      {/* Debug Info Block (Merged) */}
      {showDebug && (
        <div className="mb-2 bg-black/60 backdrop-blur-md text-white p-2 rounded-md text-[10px] font-mono text-right shadow-lg border border-white/10 w-36">
          <div className="opacity-70 text-[8px] tracking-widest uppercase mb-1 border-b border-white/20 pb-0.5">Debug Stats</div>
          <div className="flex justify-between">
            <span className="opacity-70">ZOOM:</span>
            <span>{zoom?.toFixed(2)}x</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-70">OBJS:</span>
            <span>{renderedCount ?? 0}</span>
          </div>
          <div className="flex justify-between items-end mt-1 pt-1 border-t border-white/10">
            <span className="opacity-70 text-[8px]">HOVER:</span>
            <span className={`text-green-300 truncate text-right whitespace-nowrap ml-1 ${!hoveredRegion ? 'opacity-0' : ''}`}>
              {hoveredRegion || '-'}
            </span>
          </div>
        </div>
      )}

      {/* Scale Bar Block */}
      {width > 0 && (
        <div className="drop-shadow-md bg-white/80 p-1.5 rounded-md backdrop-blur-sm flex flex-col items-end border border-white/40">
          {!showDebug && zoom && (
            <span className="text-[10px] font-bold text-slate-600 mb-0.5">
              x{zoom.toFixed(1)}
            </span>
          )}
          <div className="flex flex-col items-end">
            <div
              className="h-1.5 border-b-2 border-r-2 border-l-2 border-slate-600 mb-0.5"
              style={{ width: `${width}px` }}
            />
            <span className="text-[10px] font-semibold text-slate-700 leading-none">
              {distance} {unit}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
