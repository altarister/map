/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { getStageStrategy } from '../../game/stages/registry';
import { useMapScale } from '../../hooks/useMapScale';
import { useGame } from '../../contexts/GameContext';
import { useGeoContext } from '../../contexts/GeoDataContext';
import { useMapContext } from '../../contexts/MapContext';
import { useSettings } from '../../contexts/SettingsContext';
import { BottomBar } from '../layout/BottomBar';
import { RegionLabel } from './RegionLabel';
import { BaseMapLayerCanvas } from './BaseMapLayerCanvas';
import type { BaseMapLayerHandle } from './BaseMapLayerCanvas';
import { SelectMapLayerCanvas } from './SelectMapLayerCanvas';
import { InteractionLayer } from './InteractionLayer';
import { RoadLayer } from './RoadLayer';
import type { RoadLayerHandle } from './RoadLayer';
import { useMapDimensions } from '../../hooks/useMapDimensions';
import { useMapStyles } from '../../hooks/useMapStyles';
import { useMapZoom } from '../../hooks/useMapZoom';
import { useMapGeometry } from '../../hooks/useMapGeometry';
import { useMapAutoZoom } from '../../hooks/useMapAutoZoom';
import { useMapCrossfadeTransition } from '../../hooks/useMapCrossfadeTransition';
import { log } from '../../lib/debug';


import { MAP_THEME_COLORS } from '../../styles/themes';


export const Map = () => {
  // ── Context & Settings ──────────────────────────────────────────────────────
  const {
    gameState,
    checkAnswer,
    lastFeedback,
    answeredRegions,
    currentStage,
    isBasicMode,
    highlightRegions,
    startGame,
    isHintActive,
    currentQuestion,
    selectionLevel,
    setSelectionLevel,
    currentFocusCode,
    setCurrentFocusCode
  } = useGame();

  const {
    fullMapData,
    level1Data,
    filteredMapData: mapData,
    cityData,
    rawCityData, // 방금 추가된 프롭
    roadData,
    loading,
    error,
    selectedChapter,
  } = useGeoContext();

  const { theme, showDebugInfo, viewOptions } = useSettings();
  const colors = MAP_THEME_COLORS[theme];
  const { setTransform, hoveredRegion, setHoveredRegion, layerVisibility, roadOpacity } = useMapContext();
  const { scaleWidth, scaleDistance, scaleUnit, handleMove } = useMapScale();
  const [prototypeLayerVisible, setPrototypeLayerVisible] = useState(false);

  // ── Dimensions ──────────────────────────────────────────────────────────────
  const containerNodeRef = useRef<HTMLDivElement | null>(null);
  const { ref: containerRefCallback, width, height } = useMapDimensions<HTMLDivElement>();
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    containerNodeRef.current = node;
    containerRefCallback(node);
  }, [containerRefCallback]);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const roadLayerRef = useRef<RoadLayerHandle | null>(null);
  const baseMapLayerRef = useRef<BaseMapLayerHandle | null>(null);
  const selectMapLayerRef = useRef<BaseMapLayerHandle | null>(null);

  // ── Zoom ────────────────────────────────────────────────────────────────────
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  const { handleZoomStart, handleCrossfadeStart } = useMapCrossfadeTransition({
    canvasWrapperRef,
    containerNodeRef,
  });

  const handleZoom = useCallback((t: { x: number; y: number; k: number }) => {
    setTransform(t);
    handleMove({ zoom: t.k });
  }, [setTransform, handleMove]);

  const handleTransformTick = useCallback((t: { x: number; y: number; k: number }, lastDrawn: { x: number; y: number; k: number }) => {
    baseMapLayerRef.current?.setCssTransform(t, lastDrawn);
    selectMapLayerRef.current?.setCssTransform(t, lastDrawn);
    roadLayerRef.current?.setCssTransform(t, lastDrawn);
  }, []);

  const handleTransformEnd = useCallback((t: { x: number; y: number; k: number }) => {
    baseMapLayerRef.current?.draw(t);
    selectMapLayerRef.current?.draw(t);
    roadLayerRef.current?.draw(t);
  }, []);

  const { svgRef, gRef, transform: zoomTransform, zoomTo } = useMapZoom({
    width,
    height,
    onZoom: handleZoom,
    onZoomStart: handleZoomStart,
    onMomentumStart: () => { },
    onCrossfadeStart: handleCrossfadeStart,
    onTransformTick: handleTransformTick,
    onTransformEnd: handleTransformEnd,
  });

  // ── Geometry & Derived Map Data ─────────────────────────────────────────────
  const { projection, pathGenerator, features, featureAreas, filteredCityFeatures } = useMapGeometry({
    fullMapData,
    level1Data,
    mapData,
    cityData,
    width,
    height,
  });

  const { getFillColor, getStrokeColor } = useMapStyles({
    lastFeedback,
    answeredRegions,
    isBasicMode,
    defaultHoverFill: colors.hoverDefaultFill, // 테마별 호버 색상 (kids: #fde68a, tactical: #333333)
  });

  const isSingleRegion = filteredCityFeatures.length === 1;
  const stageConfig = useMemo(() => getStageStrategy(currentStage).config, [currentStage]);
  const forceShowTowns = stageConfig.mapOptions?.forceShowTownGeometry ?? false;

  // [NEW UX: 4단계 선택 렌더링 스위칭]
  const showTownGeometry = gameState === 'PLAYING' && (forceShowTowns || isSingleRegion || zoomTransform.k >= 1.5);

  const featuresToRender = useMemo(() => {
    if (gameState === 'REGION_SELECT') {
      if (selectionLevel === 'PROVINCE') return level1Data?.features || [];
      if (selectionLevel === 'CITY') {
        if (!currentFocusCode) return cityData?.features || [];
        // Extract prefix (e.g. 41 for Gyeonggi)
        const prefix = currentFocusCode.substring(0, 2);
        return cityData?.features.filter((f: any) => f.properties.code.startsWith(prefix)) || [];
      }
      if (selectionLevel === 'DISTRICT') {
        if (!currentFocusCode) return rawCityData?.features || [];
        // Extract prefix (e.g. 4146 for Yongin)
        const prefix = currentFocusCode.substring(0, 4);
        return rawCityData?.features.filter((f: any) => f.properties.code.startsWith(prefix) && f.properties.code.length === 5 && !f.properties.code.endsWith('0')) || [];
      }
    }
    return showTownGeometry ? features : filteredCityFeatures;
  }, [gameState, selectionLevel, currentFocusCode, level1Data, cityData, rawCityData, showTownGeometry, features, filteredCityFeatures]);

  // Pass 3 컨텍스트 경계선: selectionLevel에 따라 희미하게 그릴 피처 배열
  const contextBoundaryFeatures = useMemo(() => {
    if (gameState === 'REGION_SELECT') {
      if (selectionLevel === 'PROVINCE') {
        // 전체 시/군/자치구 경계를 흐리게 → 내부 구조 미리 보여줌
        return cityData?.features ?? [];
      }
      if (selectionLevel === 'CITY') {
        // 선택한 광역(경기도) 제외, 나머지 광역(서울+인천) 단일 외곽
        return level1Data?.features.filter((f: any) =>
          f.properties.code !== currentFocusCode
        ) ?? [];
      }
      if (selectionLevel === 'DISTRICT') {
        // 같은 광역의 시/군, 현재 선택된 도시(고양시) 제외
        const provincePrefix = currentFocusCode?.substring(0, 2) ?? '';
        const cityPrefix = currentFocusCode?.substring(0, 4) ?? '';
        return cityData?.features.filter((f: any) =>
          f.properties.code.startsWith(provincePrefix) &&
          !f.properties.code.startsWith(cityPrefix)
        ) ?? [];
      }
    }
    if (gameState === 'PLAYING') {
      // 게임 중: 같은 광역의 시/군 경계 흐리게 (위치 파악용)
      const provincePrefix = featuresToRender[0]?.properties?.code?.substring(0, 2) ?? '';
      return provincePrefix
        ? (cityData?.features.filter((f: any) => f.properties.code.startsWith(provincePrefix)) ?? [])
        : [];
    }
    return [];
  }, [gameState, selectionLevel, currentFocusCode, cityData, level1Data, featuresToRender]);

  // [Canvas 1-2] 선택한 지역의 단일 통합 외곽선 (SelectMapLayerCanvas에 전달)
  const selectedBorderFeatures = useMemo(() => {
    if (gameState === 'PLAYING' && selectedChapter) {
      // 게임 진입 단계 (현재 게임중인 단계의 부모 경계) -> ex) 11200 성동구 접속 시 성동구 외곽
      const f = rawCityData?.features.find((f: any) => f.properties.code === selectedChapter);
      const fallback = cityData?.features.find((f: any) => f.properties.code === selectedChapter);
      return f ? [f] : fallback ? [fallback] : [];
    }

    if (selectionLevel === 'PROVINCE') return [];

    if (selectionLevel === 'DISTRICT' && currentFocusCode) {
      // 선택한 시/군/구 통합 단일 폴리곤 (예: 41280 고양시 전체 1개 덩어리)
      const f = cityData?.features.find((f: any) => f.properties.code === currentFocusCode);
      const fallback = rawCityData?.features.find((f: any) => f.properties.code === currentFocusCode);
      return f ? [f] : fallback ? [fallback] : [];
    }

    if (selectionLevel === 'CITY' && currentFocusCode) {
      // 선택한 광역 단일 폴리곤 (예: 41 경기도, 11 서울특별시)
      const f = level1Data?.features.find((f: any) => f.properties.code === currentFocusCode);
      return f ? [f] : [];
    }

    return [];
  }, [selectionLevel, currentFocusCode, gameState, selectedChapter, level1Data, cityData, rawCityData]);

  const labelsToRender = gameState === 'REGION_SELECT' ? featuresToRender : filteredCityFeatures;
  const showDistrictLabels = gameState === 'PLAYING' && showTownGeometry;

  // ── Auto-Zoom Controller ────────────────────────────────────────────────────
  useMapAutoZoom({
    gameState,
    selectedChapter,
    width,
    height,
    zoomTo,
    mapData,
    pathGenerator,
  });

  // [NEW UX: 4단계 선택 동기화 줌 로직]
  useEffect(() => {
    if (gameState !== 'REGION_SELECT' || !width || !height) return;

    if (selectionLevel === 'PROVINCE' || !currentFocusCode) {
      zoomTo({ x: 0, y: 0, k: 1 });
      return;
    }

    let feature: any = null;
    if (selectionLevel === 'CITY') {
      feature = level1Data?.features.find((f: any) => f.properties.code === currentFocusCode);
    } else if (selectionLevel === 'DISTRICT') {
      feature = cityData?.features.find((f: any) => f.properties.code === currentFocusCode);
    }

    if (feature) {
      const bounds = pathGenerator.bounds(feature);
      if (bounds && bounds[0] && bounds[1]) {
        const [[x0, y0], [x1, y1]] = bounds;
        const dx = x1 - x0;
        const dy = y1 - y0;
        const x = (x0 + x1) / 2;
        const y = (y0 + y1) / 2;
        const scale = Math.max(1, Math.min(12, 0.8 / Math.max(dx / width, dy / height)));
        zoomTo({ x: width / 2 - scale * x, y: height / 2 - scale * y, k: scale });
      }
    }
  }, [selectionLevel, currentFocusCode, gameState, width, height, zoomTo, pathGenerator, level1Data, cityData]);

  // ── Event Handlers ──────────────────────────────────────────────────────────
  const handleRegionContextMenu = useCallback((_event: React.MouseEvent, _region: any) => {
    // 우클릭 인텔 팝업은 ActionBar의 인텔 카드로 대체됨
  }, []);

  const handleRegionClick = useCallback((code: string) => {
    if (gameState === 'REGION_SELECT') {
      const feature = featuresToRender.find((f: any) => f.properties.code === code);
      if (!feature) return;

      if (selectionLevel === 'PROVINCE') {
        setCurrentFocusCode(code);
        setSelectionLevel('CITY');
        return;
      }

      if (selectionLevel === 'CITY') {
        const groupCode = code;
        
        // 거대 도시 예외 처리 판단 (3단계 일반구 포함 여부)
        const hasSubDistricts = rawCityData?.features.some((f: any) => 
          f.properties.code.startsWith(groupCode.substring(0, 4)) && 
          f.properties.code.length === 5 && 
          !f.properties.code.endsWith('0')
        );

        if (hasSubDistricts && groupCode.endsWith('0')) {
            setCurrentFocusCode(groupCode);
            setSelectionLevel('DISTRICT');
            return;
        }

        // 일반 시/군이거나 일반구가 없는 구 -> 바로 PLAYING (4단계)
        const prefix = groupCode.endsWith('0') ? groupCode.substring(0, 4) : groupCode;
        const targetDongs = fullMapData?.features.filter((f: any) =>
          f.properties.code.startsWith(prefix) &&
          (f.properties as any)._isEmdGroup === true
        ) || [];

        startGame({
          chapterCode: groupCode,
          overrideRegions: targetDongs,
          highlightRegions: [],
          isBasicMode: false
        });
        return;
      }

      if (selectionLevel === 'DISTRICT') {
        // 일반구 클릭 -> 바로 PLAYING (4단계)
        const targetDongs = fullMapData?.features.filter((f: any) =>
          f.properties.code.startsWith(code) &&
          (f.properties as any)._isEmdGroup === true
        ) || [];

        startGame({
          chapterCode: code,
          overrideRegions: targetDongs,
          highlightRegions: [],
          isBasicMode: false
        });
        return;
      }
      return;
    }

    if (gameState !== 'PLAYING') return;

    if (!forceShowTowns && !showTownGeometry) {
      log.game('[Map] Cannot answer: zoom in to see towns.');
      return;
    }
    checkAnswer({ type: 'MAP_CLICK', regionCode: code });
  }, [gameState, forceShowTowns, showTownGeometry, checkAnswer, filteredCityFeatures, featuresToRender, selectionLevel, setCurrentFocusCode, setSelectionLevel, rawCityData, fullMapData, startGame]);

  // ── Early Returns ───────────────────────────────────────────────────────────
  if (loading) return <div className="flex justify-center items-center h-full text-gray-400 font-mono">Loading map...</div>;
  if (error) return <div className="text-red-500 flex justify-center items-center h-full font-mono">Error: {error.message}</div>;
  if (!mapData || !cityData) return <div className="flex justify-center items-center h-full text-gray-400 font-mono">No map data</div>;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden ${layerVisibility.grid ? 'map-grid' : 'bg-background'}`}
    >
      {/* =============== [START] 하위 Canvas 레이어 래퍼 =============== */}
      {/* Canvas 레이어 래퍼: 이벤트 캡처 기능이 없고 그려지기만 하는 도화지들입니다. 스냅샷 복제를 위해 ref 할당 */}
      <div
        id="layer-container-canvas"
        ref={canvasWrapperRef}
        data-layer-group="canvas-basemap-container"
        style={{
          position: 'absolute', inset: 0,
        }}
      >
        {/* Layer 1: Base Map (Canvas) - 가장 하단에 깔리는 행정구역 색칠 도화지 */}
        {/* 정답을 맞춘 지역의 색상('#86efac')은 이 도화지 위에 영구적으로 칠해집니다. */}
        <BaseMapLayerCanvas
          ref={baseMapLayerRef}
          features={featuresToRender}
          contextBoundaryFeatures={contextBoundaryFeatures}
          projection={projection}
          theme={theme}
          themeColors={colors}
          getFillColor={getFillColor}
          getStrokeColor={getStrokeColor}
          initialTransform={zoomTransform}
          width={width}
          height={height}
          answeredRegions={answeredRegions}
          lastFeedback={lastFeedback}
          showBoundaries={layerVisibility.boundaries}
          isHintActive={isHintActive}
          currentQuestionTargetCode={currentQuestion?.type === 'LOCATE_SINGLE' ? currentQuestion.target.code : undefined}
        />

        {/* Layer 1-2: SelectMapLayer (Canvas) - 현재 진입한 지역 전체를 감싸는 굵은 단일 외곽선 액자 */}
        <SelectMapLayerCanvas
          ref={selectMapLayerRef}
          features={selectedBorderFeatures}
          projection={projection}
          theme={theme}
          themeColors={colors}
          initialTransform={zoomTransform}
          width={width}
          height={height}
        />

        {/* Layer 2: Roads (Canvas) - 그 위에 얹어지는 도로망 도화지 */}
        {roadData && (
          <RoadLayer
            ref={roadLayerRef}
            features={roadData.features}
            projection={projection}
            initialTransform={zoomTransform}
            width={width}
            height={height}
            theme={theme}
            visibleMotorway={layerVisibility.roadMotorway}
            visibleTrunk={layerVisibility.roadTrunk}
            visiblePrimary={layerVisibility.roadPrimary}
            visibleSecondary={layerVisibility.roadSecondary}
            visibleOther={layerVisibility.roadOther}
            roadOpacity={roadOpacity}
          />
        )}
      </div>

      {/* =============== [START] 상단 SVG 인터랙션 & 오버레이 레이어 =============== */}
      {/* 사용자의 클릭, 마우스 오버(Hover) 이벤트를 수집하고 UI 피드백을 실시간으로 덧그리는 투명한 유리판입니다. */}
      {/* 3층(투명 클릭영역), 4층(히트맵/펄스 외곽선), 5층(텍스트 라벨) 요소가 포함되어 있습니다. */}
      <svg
        id="layer-container-svg"
        ref={svgRef}
        data-layer-group="svg-interaction-overlay"
        width="100%" height="100%"
        className="absolute inset-0"
        style={{ zIndex: 20 }}
      >
        {/* InteractionLayer: gRef 내부 (SVG transform 적용됨) */}
        <g id="layer-3-interaction-group" ref={gRef} 
        // style={{ willChange: 'transform' }} 
        // transform={`translate(${zoomTransform.x},${zoomTransform.y}) scale(${zoomTransform.k})`}
        >
          {/* Layer 3: Interaction Layer (투명한 폴리곤들로 사용자 클릭/호버 판정) */}
          <InteractionLayer
            features={featuresToRender}
            pathGenerator={pathGenerator}
            gameState={gameState}
            showTownGeometry={showTownGeometry}
            onRegionHover={setHoveredRegion}
            answeredRegions={answeredRegions}
            onRegionContextMenu={handleRegionContextMenu}
            onRegionClick={handleRegionClick}
          />

          {/* Hierarchical Boundaries (EMD) Overlay: Rendered underneath hovers but above base map */}
          {highlightRegions && highlightRegions.length > 0 && (
            <g style={{ pointerEvents: 'none' }}>
              {highlightRegions.map((region: any) => (
                <path
                  // key={`highlight-${region.properties.code}`}
                  d={pathGenerator(region) || ''}
                  // fill="none"
                  // stroke={theme === 'tactical' ? '#444' : '#94a3b8'}
                  // strokeWidth={2.8 / zoomTransform.k}
                  // strokeOpacity={0.9}
                />
              ))}
            </g>
          )}

          {/* Layer 4: Visual Overlays (Hover 히트맵 채도, Selection 테두리, Feedback 오답 펄스 애니메이션) */}
          <g id="layer-4-visual-overlays" data-layer-id="visual-overlays" style={{ pointerEvents: 'none' }}>
            {hoveredRegion && (gameState === 'PLAYING' || gameState === 'REGION_SELECT') && !answeredRegions.has(hoveredRegion) && (() => {
              const feature = featuresToRender.find((f: any) => f.properties.code === hoveredRegion) as any;
              return feature ? (
                <path
                  d={pathGenerator(feature) || ''}
                  fill={getFillColor(feature, true)}
                  fillOpacity={0.5}
                  // stroke={getStrokeColor(hoveredRegion, true)}
                  // strokeWidth={1.5 / zoomTransform.k}
                  // className="transition-all duration-200"
                  // style={{ mixBlendMode: 'multiply' }}
                />
              ) : null;
            })()}

            {/* 정답/오답 피드백 오버레이 */}
            {lastFeedback && (
              <path
                d={pathGenerator(featuresToRender.find((f: any) => f.properties.code === lastFeedback.regionCode) as any) || ''}
                fill="none"
                // fill="none"
                // stroke={lastFeedback.isCorrect ? '#4ade80' : '#f87171'}
                // strokeWidth={3 / zoomTransform.k}
                // className="animate-pulse"
                // style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.5))' }}
              />
            )}
          </g>
          {/* Layer 5: Labels (SVG Texts) - 텍스트 라벨 (가장 최상단에 떠 있는 동네 이름표) */}
          <g id="layer-5-text-labels" data-layer-id="svg-text-labels">
            {/* 라벨: gRef 내부. CSS scale(k)로 위치 보정, font-size=14/k로 크기 상쇄.
                setTransform이 매 zoom 프레임 호출되므로 k값이 항상 최신 → 스냅 없음. */}
          {(gameState === 'PLAYING' || gameState === 'REGION_SELECT') && layerVisibility.labels && (
            <>
              {!showDistrictLabels && labelsToRender.map((feature: any) => (
                <RegionLabel
                  key={`label-city-${feature.properties.code}`}
                  feature={feature}
                  projection={projection}
                  transform={zoomTransform}
                  answeredRegions={answeredRegions}
                  lastFeedback={lastFeedback}
                  gameState={gameState}
                  fontScale={gameState === 'REGION_SELECT' ? 0.9 : 1.5}
                  baseArea={featureAreas[feature.properties.code] || 0}
                />
              ))}

              {/* Watermark Labels (EMD level labels) */}
              {highlightRegions && highlightRegions.length > 0 && highlightRegions.map((feature: any) => (
                <RegionLabel
                  key={`label-watermark-${feature.properties.code}`}
                  feature={feature}
                  projection={projection}
                  transform={zoomTransform}
                  answeredRegions={answeredRegions}
                  lastFeedback={lastFeedback}
                  gameState={gameState}
                  fontScale={1.5}  // 거대한 워터마크 크기 (기존 2.5에서 축소)
                  baseArea={featureAreas[feature.properties.code] || 0}
                  isWatermark={true}
                />
              ))}

              {/* District (Ri-level) Labels */}
              {showDistrictLabels && featuresToRender.map((feature: any) => (
                <RegionLabel
                  key={`label-district-${feature.properties.code}`}
                  feature={feature}
                  projection={projection}
                  transform={zoomTransform}
                  answeredRegions={answeredRegions}
                  lastFeedback={lastFeedback}
                  gameState={gameState}
                  fontScale={1.0}
                  baseArea={featureAreas[feature.properties.code] || 0}
                />
              ))}
            </>
          )}
          </g>
        </g>
      </svg>



      {viewOptions.showScaleBar && gameState !== 'INITIAL' && (
        <BottomBar
          width={scaleWidth}
          distance={scaleDistance}
          unit={scaleUnit}
          zoom={zoomTransform.k}
          hoveredRegion={(() => {
            const f = featuresToRender.find((feature: any) => feature.properties.code === hoveredRegion);
            return f ? f.properties.name : undefined;
          })()}
          renderedCount={featuresToRender.length}
          showDebug={showDebugInfo}
        />
      )}

      {/* [4계층 연동] 뒤로가기 버튼: depth ≥ 2일 때 표시 */}
      {gameState === 'REGION_SELECT' && selectionLevel !== 'PROVINCE' && (
        <button
          className="absolute top-20 left-4 z-50 bg-slate-900/90 border border-slate-600 hover:border-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-mono transition-all duration-200 hover:bg-slate-800"
          onClick={() => {
            if (selectionLevel === 'CITY') {
              setSelectionLevel('PROVINCE');
              setCurrentFocusCode(null);
            } else if (selectionLevel === 'DISTRICT') {
              const parentPrefix = currentFocusCode?.substring(0, 2) || null;
              setSelectionLevel('CITY');
              setCurrentFocusCode(parentPrefix);
            }
          }}
        >
          ← 뒤로 ({selectionLevel === 'CITY' ? '광역 선택' : '시/군 선택'})
        </button>
      )}

      {!showTownGeometry && gameState === 'PLAYING' && !forceShowTowns && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 glass-panel text-white px-4 py-2 rounded-full text-xs font-mono">
          [확대하여 지역 탐색]
        </div>
      )}

    </div>
  );
};
