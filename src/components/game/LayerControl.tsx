import { useState } from 'react';
import { useMapContext } from '../../contexts/MapContext';
import { Button } from '../ui/Button';

export const LayerControl = () => {
    const { layerVisibility, toggleLayer } = useMapContext();
    const [isOpen, setIsOpen] = useState(false);

    // Labels for display
    const LAYERS = [
        { id: 'labels', label: 'DISTRICT NAMES' },
        { id: 'roads', label: 'ROAD NETWORK' },
        { id: 'boundaries', label: 'TERRAIN / BASE' },
        { id: 'grid', label: 'GRID LINES' },
    ] as const;

    return (
        <div className="absolute top-20 right-4 z-40 flex flex-col items-end">
            {/* Toggle Button */}
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-10 h-10 p-0 rounded-full shadow-lg border-2 transition-all duration-300 ${isOpen
                    ? 'bg-primary text-primary-foreground border-primary rotate-90'
                    : 'bg-background/80 backdrop-blur border-border text-muted-foreground hover:text-foreground'
                    }`}
                aria-label="Toggle Layer Control"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5"
                >
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
            </Button>

            {/* Dropdown Panel */}
            <div
                className={`
          mt-2 p-4 bg-background/90 backdrop-blur-md border border-border rounded-xl shadow-xl
          transition-all duration-300 origin-top-right overflow-hidden
          ${isOpen
                        ? 'opacity-100 scale-100 translate-y-0 max-h-[300px]'
                        : 'opacity-0 scale-95 -translate-y-4 max-h-0 pointer-events-none p-0 border-0'}
        `}
            >
                <h3 className="text-xs font-black text-muted-foreground tracking-widest uppercase mb-3 border-b border-border pb-2">
                    Tactical Overlay
                </h3>

                <div className="flex flex-col gap-2 min-w-[160px]">
                    {LAYERS.map(({ id, label }) => (
                        <label
                            key={id}
                            className="flex items-center justify-between cursor-pointer group hover:bg-muted/50 p-2 rounded transition-colors"
                        >
                            <span className={`text-xs font-bold tracking-tight transition-colors ${layerVisibility[id] ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {label}
                            </span>

                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={layerVisibility[id]}
                                    onChange={() => toggleLayer(id as any)}
                                />
                                <div className={`w-9 h-5 rounded-full transition-colors duration-200 ease-in-out ${layerVisibility[id] ? 'bg-primary' : 'bg-muted'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full shadow absolute top-1 transition-transform duration-200 ease-in-out ${layerVisibility[id] ? 'left-5' : 'left-1'}`} />
                                </div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
};
