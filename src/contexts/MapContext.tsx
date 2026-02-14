import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface MapTransform {
    x: number;
    y: number;
    k: number; // zoom scale
}

interface MapContextType {
    transform: MapTransform;
    setTransform: (transform: MapTransform) => void;
    hoveredRegion: string | null;
    setHoveredRegion: (region: string | null) => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [transform, setTransform] = useState<MapTransform>({ x: 0, y: 0, k: 1 });
    const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

    const value = {
        transform,
        setTransform,
        hoveredRegion,
        setHoveredRegion
    };

    return (
        <MapContext.Provider value={value}>
            {children}
        </MapContext.Provider>
    );
};

export const useMapContext = () => {
    const context = useContext(MapContext);
    if (context === undefined) {
        throw new Error('useMapContext must be used within a MapProvider');
    }
    return context;
};
