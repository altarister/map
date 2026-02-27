/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { useGeoData } from '../hooks/useGeoData';
import type { RegionCollection, RoadCollection } from '../types/geo';

interface GeoDataContextType {
  fullMapData: RegionCollection | null;
  cityData: RegionCollection | null;
  filteredMapData: RegionCollection | null;
  setFilteredMapData: (data: RegionCollection | null) => void;
  roadData: RoadCollection | null;
  loading: boolean;
  progress: number;
  error: Error | null;
  selectedChapter: string | null;
  setSelectedChapter: (chapter: string | null) => void;
}

const GeoDataContext = createContext<GeoDataContextType | undefined>(undefined);

export const GeoDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: fullMapData, cityData, roadData, loading, progress, error } = useGeoData();
  const [filteredMapData, setFilteredMapData] = useState<RegionCollection | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  useEffect(() => {
    if (fullMapData) {
      // 함수형 업데이트: 아직 초기화되지 않은 경우에만 세팅 (deps에서 filteredMapData 제거)
      setFilteredMapData(prev => prev ?? fullMapData);
    }
  }, [fullMapData]);

  const value = useMemo(() => ({
    fullMapData,
    cityData,
    filteredMapData,
    setFilteredMapData,
    roadData,
    loading,
    progress,
    error,
    selectedChapter,
    setSelectedChapter,
  }), [fullMapData, cityData, filteredMapData, roadData, loading, progress, error, selectedChapter]);

  return (
    <GeoDataContext.Provider value={value}>
      {children}
    </GeoDataContext.Provider>
  );
};

export const useGeoContext = () => {
  const context = useContext(GeoDataContext);
  if (context === undefined) {
    throw new Error('useGeoContext must be used within a GeoDataProvider');
  }
  return context;
};
