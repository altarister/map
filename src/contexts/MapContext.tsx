import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

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

    // Layer Visibility Control
    layerVisibility: {
        labels: boolean;
        boundaries: boolean;
        grid: boolean;

        // Road Layers
        roadMotorway: boolean;
        roadTrunk: boolean;
        roadPrimary: boolean;
        roadSecondary: boolean;
        roadOther: boolean;
    };
    toggleLayer: (layerId: keyof MapContextType['layerVisibility']) => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [transform, setTransform] = useState<MapTransform>({ x: 0, y: 0, k: 1 });
    const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

    // Default Visibility:
    // - Labels: OFF
    // - Boundaries & Grid: ON (Always)
    // - Roads: All ON by default (except maybe 'other'?) -> User can toggle.
    const [layerVisibility, setLayerVisibility] = useState({
        labels: false,
        boundaries: true,
        grid: true,

        // Road Layers
        roadMotorway: true, // 고속도로
        roadTrunk: true,    // 국도
        roadPrimary: true,  // 주요도로
        roadSecondary: false,// 보조도로 (Default OFF)
        roadOther: false     // 기타도로 (Default OFF)
    });

    const toggleLayer = useCallback((layerId: keyof typeof layerVisibility) => {
        setLayerVisibility(prev => ({
            ...prev,
            [layerId]: !prev[layerId]
        }));
    }, []);



    const value = {
        transform,
        setTransform,
        hoveredRegion,
        setHoveredRegion,
        layerVisibility,
        toggleLayer
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
