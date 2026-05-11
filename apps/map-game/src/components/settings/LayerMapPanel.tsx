// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { useMapContext } from '../../contexts/MapContext';

interface LayerMapPanelProps {
  isOpen: boolean;
}

const MAP_LAYERS = [
  { id: 'boundaries', label: '지역 경계' },
  { id: 'labels',     label: '지역 명칭' },
  { id: 'grid',       label: '그리드' },
] as const;

export const LayerMapPanel = ({ isOpen }: LayerMapPanelProps) => {
  const { layerVisibility, toggleLayer } = useMapContext();

  return (
    <div className={`
      absolute bottom-full right-0 mb-2 w-44
      glass-panel !rounded-lg shadow-2xl p-2
      origin-bottom-right transition-all duration-200
      ${isOpen
        ? 'opacity-100 scale-100 translate-y-0'
        : 'opacity-0 scale-95 translate-y-1 pointer-events-none'}
    `}>
      {/* Header */}
      <div className="px-2 py-1.5 border-b border-border mb-1 flex items-center gap-2">
        <div className="w-1 h-1 rounded-full bg-primary/70" />
        <span className="text-[9px] font-bold font-mono text-muted-foreground tracking-widest uppercase">
          지도 레이어
        </span>
      </div>

      {/* Map Layer Toggles */}
      <div className="flex flex-col gap-0.5">
        {MAP_LAYERS.map(({ id, label }) => (
          <div
            key={id}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={() => toggleLayer(id as any)}
            className="flex items-center justify-between cursor-pointer hover:bg-muted/50 px-2 py-1.5 rounded transition-colors"
          >
            <span className={`text-[10px] font-mono font-bold transition-colors ${
              layerVisibility[id] ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {label}
            </span>
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
  );
};
