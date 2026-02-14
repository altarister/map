import React from 'react';
import { useMapContext } from '../../contexts/MapContext';
import { useGame } from '../../contexts/GameContext';

export const DebugInfoPanel = React.memo(() => {
    const { transform, hoveredRegion } = useMapContext();
    const { filteredMapData } = useGame();

    return (
        <div className="absolute top-20 left-4 glass-panel p-4 w-64 z-20">
            <h3 className="text-xs text-gray-400 font-mono uppercase mb-2">
                Debug Info
            </h3>
            <div className="text-xs font-mono space-y-1 text-white">
                <div>Zoom: {transform.k.toFixed(2)}</div>
                <div>Pan: [{transform.x.toFixed(0)}, {transform.y.toFixed(0)}]</div>
                <div>Rendered: {filteredMapData?.features.length || 0}</div>
                <div>Hover: {hoveredRegion || '-'}</div>
            </div>
        </div>
    );
});

DebugInfoPanel.displayName = 'DebugInfoPanel';
