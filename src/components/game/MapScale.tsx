interface MapScaleProps {
  width: number;
  distance: number;
  unit: string;
}

export const MapScale = ({ width, distance, unit }: MapScaleProps) => {
  if (width === 0) return null;

  return (
    <div className="absolute bottom-4 right-4 flex flex-col items-end pointer-events-none select-none drop-shadow-md">
      <div 
        className="h-2 border-b-2 border-r-2 border-l-2 border-slate-600 mb-1"
        style={{ width: `${width}px` }}
      />
      <span className="text-xs font-semibold text-slate-700">
        {distance} {unit}
      </span>
    </div>
  );
};
