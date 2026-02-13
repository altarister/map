import { useState, useCallback, useEffect, memo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from '@vnedyalk0v/react19-simple-maps';
import { geoCentroid } from 'd3-geo';
import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useMapStyles } from '../../hooks/useMapStyles';
import { useMapScale } from '../../hooks/useMapScale';
import { useGeoData } from '../../hooks/useGeoData'; // Added missing import

import { RegionLabel } from './RegionLabel';
import { MapScale } from './MapScale';
import type { RegionFeature } from '../../types/geo';
import { getLevelStrategy } from '../../game/levels/registry';

// 상수: 지도 투영 설정
const PROJECTION_CONFIG = {
  scale: 8000,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  center: [127.25, 37.55] as any, // 경기도 중심
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rotate: [0, 0, 0] as any,
};


// Base Layer Item (Memoized)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface BaseMapItemProps {
  geo: any;
  code: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  gameState: string;
  onEnter: (code: string) => void;
  onLeave: () => void;
  onClick: (code: string) => void;
  feature: RegionFeature;
  answeredRegions: Set<string>;
  lastFeedback: any;
  zoom: number;
  fontSize: number;
}

const BaseMapItem = memo(({ 
  geo, code, fill, stroke, strokeWidth, gameState, 
  onEnter, onLeave, onClick, 
  feature, answeredRegions, lastFeedback, zoom, fontSize 
}: BaseMapItemProps) => {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <g key={(geo as any).rsmKey || code}>
      <Geography
        geography={geo}
        onMouseEnter={() => onEnter(code)}
        onMouseLeave={onLeave}
        onClick={() => onClick(code)}
        style={{
          default: {
            fill,
            stroke,
            strokeWidth,
            outline: 'none',
            transition: 'all 0.1s ease',
            vectorEffect: 'non-scaling-stroke',
          },
          hover: {
            fill, // Base Layer는 Hover 색상 변경 없음 (Overlay가 담당)
            stroke: '#6366f1', 
            strokeWidth: 3 / zoom, 
            outline: 'none',
            cursor: gameState === 'PLAYING' ? 'pointer' : 'default',
            vectorEffect: 'non-scaling-stroke',
          },
          pressed: {
            fill,
            outline: 'none',
            vectorEffect: 'non-scaling-stroke',
          },
        } as any}
      />
      {/* <RegionLabel 
        feature={feature} 
        gameState={gameState as any} 
        answeredRegions={answeredRegions} 
        lastFeedback={lastFeedback}
        zoom={zoom}
        fontScale={fontSize}
      /> */}
    </g>
  );
}, (prev, next) => {
  // Custom Comparison for Performance
  // deep comparison of answeredRegions Set is expensive, so checking size/has might be needed
  // But here answeredRegions is a Referentially Stable Set? No, it's new every update usually?
  // Let's rely on standard shallow comparison assuming props are primitive/stable enough.
  // Actually, answeredRegions is a Set. Shallow compare will fail if it's a new Set instance.
  // We need to check if 'code' is in prev.answered and next.answered.
  
  if (prev.code !== next.code) return false;
  if (prev.zoom !== next.zoom) return false;
  if (prev.fill !== next.fill) return false;
  if (prev.stroke !== next.stroke) return false;
  
  // Check if answered status changed for THIS item
  const wasAnswered = prev.answeredRegions.has(prev.code);
  const isAnswered = next.answeredRegions.has(next.code);
  if (wasAnswered !== isAnswered) return false;

  // Check feedback
  if (prev.lastFeedback !== next.lastFeedback) return false; // Simple ref check

  return true;
});
BaseMapItem.displayName = 'BaseMapItem';

// 줌 설정 상수
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 8;
const LOD_THRESHOLD = 2.5;

export const Map = () => {
  const { data: mapData, level2Data, loading, error } = useGeoData();
  const [showLevel3, setShowLevel3] = useState(false);
  const [hoveredInfo, setHoveredInfo] = useState<string>('');

  // Debug: Track cursor for coordinate verification
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  }, []);

  if (loading) return <div className="flex justify-center items-center h-full">지도 로딩 중...</div>;
  if (error) return <div className="flex justify-center items-center h-full text-red-500">에러: {error.message}</div>;

  const currentData = showLevel3 ? mapData : level2Data;
  
  // DEBUG: Check what data we are actually rendering
  useEffect(() => {
    if (showLevel3 && currentData && currentData.features.length > 0) {
      console.log("[Map Debug] Level 3 Data Loaded:", currentData.features.length);
      console.log("[Map Debug] First 5 Features:", currentData.features.slice(0, 5).map((f: any) => ({
        code: f.properties.code,
        name: f.properties.name,
        geometryType: f.geometry.type
      })));
    }
  }, [showLevel3, currentData]);

  const currentColor = showLevel3 ? '#fca5a5' : '#93c5fd'; // Red vs Blue
  const currentBorder = showLevel3 ? '#ef4444' : '#3b82f6';

  return (
    <div className="w-full h-full bg-slate-50 rounded-lg overflow-hidden border border-slate-200 shadow-inner relative" onMouseMove={handleMouseMove}>
      
      {/* ---------------- DEGBUG CONTROLS ---------------- */}
      <div className="absolute top-4 right-4 z-50 bg-white p-4 rounded shadow border space-y-2">
        <h3 className="font-bold border-b pb-1">Map Debugger</h3>
        <div className="text-xs text-gray-500">
           Cursor: ({Math.round(cursorPos.x)}, {Math.round(cursorPos.y)})
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm">Level:</span>
          <button 
            onClick={() => setShowLevel3(false)}
            className={`px-3 py-1 text-xs rounded border ${!showLevel3 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            Level 2 (Blue)
          </button>
          <button 
            onClick={() => setShowLevel3(true)}
            className={`px-3 py-1 text-xs rounded border ${showLevel3 ? 'bg-red-500 text-white' : 'bg-gray-100'}`}
          >
            Level 3 (Red)
          </button>
        </div>

        <div className="text-xs mt-2">
            <div>Files: {currentData?.features.length || 0} regions</div>
            <div>Hover: {hoveredInfo || 'None'}</div>
        </div>
      </div>
      {/* -------------------------------------------------- */}

      <ComposableMap
        projection="geoMercator"
        projectionConfig={PROJECTION_CONFIG}
        className="w-full h-full"
      >
        <ZoomableGroup zoom={1} minZoom={0.5} maxZoom={8}>
          <Geographies geography={currentData} key={showLevel3 ? 'level3-data' : 'level2-data'}>
            {({ geographies }) => 
              geographies.map((geo) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const feature = geo as any;
                const code = feature.properties?.code;
                const name = feature.properties?.name;
                
                return (
                  <Geography
                    key={feature.rsmKey || code}
                    geography={geo}
                    onMouseEnter={() => setHoveredInfo(`${code} (${name})`)}
                    onMouseLeave={() => setHoveredInfo('')}
                    style={{
                      default: {
                        // High contrast hash for sequential codes
                        fill: showLevel3 ? `hsl(${(Number(code) * 13759) % 360}, 70%, 60%)` : currentColor,
                        stroke: currentBorder,
                        strokeWidth: 0.5,
                        outline: 'none',
                      },
                      hover: {
                        fill: showLevel3 ? '#f87171' : '#60a5fa',
                        stroke: '#000000',
                        strokeWidth: 1,
                        outline: 'none',
                        cursor: 'pointer'
                      },
                      pressed: {
                         fill: '#000000',
                         outline: 'none'
                      }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
};
