/* eslint-disable react-refresh/only-export-components */
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
    setLayerVisibility: (visibility: Partial<MapContextType['layerVisibility']>) => void;

    // Road Opacity (0~10 scale, default 5 → renders as 0.0~1.0)
    roadOpacity: number;
    setRoadOpacity: (value: number) => void;
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
        roadSecondary: true,// 보조도로
        roadOther: true     // 기타도로 (기본 ON)
    });

    // Road Opacity: 0~10 슬라이더 값 (렌더링 시 /10 으로 변환)
    const [roadOpacity, setRoadOpacity] = useState(5);

    const toggleLayer = useCallback((layerId: keyof typeof layerVisibility) => {
        setLayerVisibility(prev => ({
            ...prev,
            [layerId]: !prev[layerId]
        }));
    }, []);



    const setLayerVisibilityPartial = useCallback((visibility: Partial<typeof layerVisibility>) => {
        setLayerVisibility(prev => ({ ...prev, ...visibility }));
    }, []);

    const value = {
        transform,
        setTransform,
        hoveredRegion,
        setHoveredRegion,
        layerVisibility,
        toggleLayer,
        setLayerVisibility: setLayerVisibilityPartial,
        roadOpacity,
        setRoadOpacity,
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
