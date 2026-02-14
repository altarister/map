import React from 'react';
import { useMapContext } from '../../contexts/MapContext';
import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';

export const DebugInfoPanel = () => {
    const { filteredMapData } = useGame();
    const { transform, hoveredRegion } = useMapContext();
    const { showDebugInfo } = useSettings();

    if (!showDebugInfo) return null;

    return (
        <div className="absolute top-1/2 left-4 -translate-y-1/2 glass-panel p-4 w-64 z-20 pointer-events-none">
            <h3 className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mb-2 border-b border-border pb-1">Debug Statistics</h3>
            <div className="text-xs font-mono space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                    <span className="text-muted-foreground font-bold">ZOOM:</span>
                    <span className="text-foreground">{transform.k.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground font-bold">COORDS:</span>
                    <span className="text-foreground">{transform.x.toFixed(0)}, {transform.y.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground font-bold">RENDERED:</span>
                    <span className="text-primary font-bold">{filteredMapData?.features.length || 0}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground font-bold">HOVER:</span>
                    <span className="text-foreground">{hoveredRegion || '-'}</span>
                </div>
            </div>
        </div>
    );
};
