import { useState, useCallback, useMemo } from 'react';
import { geoPath, geoMercator } from 'd3-geo';
import { useGeoData } from '../../hooks/useGeoData';

export const Map = () => {
  const { data: mapData, level2Data, loading, error } = useGeoData();
  const [showLevel3, setShowLevel3] = useState(false);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Select current data based on level
  const currentData = showLevel3 ? mapData : level2Data;

  // Create D3 projection and path generator
  const pathGenerator = useMemo(() => {
    const projection = geoMercator()
      .center([127.25, 37.55])  // Gyeonggi center
      .scale(8000)
      .translate([400, 300]);  // Center in 800x600 viewBox

    return geoPath().projection(projection);
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.5, Math.min(8, z * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Loading/Error states (AFTER all hooks)
  if (loading) return (
    <div className="flex justify-center items-center h-full">
      지도 로딩 중...
    </div>
  );

  if (error) return (
    <div className="flex justify-center items-center h-full text-red-500">
      에러: {error.message}
    </div>
  );

  if (!currentData) return null;

  const features = currentData.features || [];

  // Zoom handlers
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.5, 8));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.5, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  console.log(`[Map Render] Level: ${showLevel3 ? 3 : 2}, Features: ${features.length}`);

  return (
    <div className="relative w-full h-full bg-blue-50">
      {/* Control Panel */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold">Level:</span>
          <button
            onClick={() => {
              console.log('🔵 Level 2 button clicked!');
              setShowLevel3(false);
            }}
            className={`px-3 py-1 text-xs rounded border ${!showLevel3 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            Level 2 (Blue)
          </button>
          <button
            onClick={() => {
              console.log('🔴 Level 3 button clicked!');
              setShowLevel3(true);
            }}
            className={`px-3 py-1 text-xs rounded border ${showLevel3 ? 'bg-red-500 text-white' : 'bg-gray-100'}`}
          >
            Level 3 (Red)
          </button>
        </div>

        <div className="text-xs mt-2 space-y-1">
          <div>Regions: {features.length}</div>
          <div>Zoom: {zoom.toFixed(2)}x</div>
          {hoveredRegion && <div className="text-blue-600 font-semibold">Hover: {hoveredRegion}</div>}
        </div>

        <div className="flex gap-1 mt-2">
          <button
            onClick={handleZoomIn}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            title="Zoom Out"
          >
            −
          </button>
          <button
            onClick={handleResetZoom}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            title="Reset"
          >
            ⟲
          </button>
        </div>
      </div>

      {/* SVG Map */}
      <svg
        viewBox="0 0 800 600"
        className="w-full h-full"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {features.map((feature, index) => {
            const code = feature.properties?.code;
            const name = feature.properties?.name;
            const pathData = pathGenerator(feature);

            if (!pathData) return null;

            // Color logic
            const isHovered = hoveredRegion === `${code} (${name})`;
            let fillColor: string;
            let strokeColor: string;

            if (showLevel3) {
              // Level 3: Colorful hash-based colors
              fillColor = isHovered
                ? '#f87171'
                : `hsl(${(Number(code) * 13759) % 360}, 70%, 60%)`;
              strokeColor = isHovered ? '#000000' : '#94a3b8';
            } else {
              // Level 2: Uniform color
              fillColor = isHovered ? '#60a5fa' : '#e0e7ff';
              strokeColor = isHovered ? '#000000' : '#4f46e5';
            }

            return (
              <path
                key={`region-${code}-${index}`}
                d={pathData}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={isHovered ? 1 / zoom : 0.5 / zoom}
                onMouseEnter={() => setHoveredRegion(`${code} (${name})`)}
                onMouseLeave={() => setHoveredRegion(null)}
                style={{
                  transition: 'fill 0.2s, stroke 0.2s, stroke-width 0.2s',
                  cursor: 'pointer'
                }}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
};
