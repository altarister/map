/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useCallback, useMemo } from 'react';
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
import { RouteAnimationLayer } from './RouteAnimationLayer';
import { useMapDimensions } from '../../hooks/useMapDimensions';
import { useMapStyles } from '../../hooks/useMapStyles';
import { useMapZoom } from '../../hooks/useMapZoom';
import { useMapGeometry } from '../../hooks/useMapGeometry';
import { useMapFeatures } from '../../hooks/useMapFeatures';
import { useMapCrossfadeTransition } from '../../hooks/useMapCrossfadeTransition';
import { MapZoomDispatcher } from './MapZoomDispatcher';
import { log } from '../../lib/debug';


import { MAP_THEME_COLORS } from '../../styles/themes';
import type { ViewportPadding } from '../../types/game';


interface MapProps {
  padding?: ViewportPadding;
}

export const Map = ({ padding = { top: 0, right: 0, bottom: 0, left: 0 } }: MapProps = {}) => {
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
    // selectedCallId, // Removed selectedCallId from useMapStyles
  });

  const isSingleRegion = filteredCityFeatures.length === 1;
  const stageConfig = useMemo(() => getStageStrategy(currentStage).config, [currentStage]);
  const forceShowTowns = stageConfig.mapOptions?.forceShowTownGeometry ?? false;

  // [NEW UX: 4단계 선택 렌더링 스위칭]
  const showTownGeometry = gameState === 'PLAYING' && (forceShowTowns || isSingleRegion || zoomTransform.k >= 1.5);

  const {
    featuresToRender,
    contextBoundaryFeatures,
    selectedBorderFeatures
  } = useMapFeatures({
    gameState,
    selectionLevel,
    currentFocusCode,
    selectedChapter,
    level1Data,
    cityData,
    rawCityData,
    showTownGeometry,
    baseFeatures: features,
    filteredCityFeatures,
  });

  const labelsToRender = gameState === 'REGION_SELECT' ? featuresToRender : filteredCityFeatures;
  const showDistrictLabels = gameState === 'PLAYING' && showTownGeometry;


  // ── Event Handlers ──────────────────────────────────────────────────────────
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
          !!(f.properties as any)._isEmdGroup
        ) || [];

        // 2단계 설정 불러오기 (없으면 기본값)
        const savedSettings = localStorage.getItem('STAGE2_SETTINGS');
        let stage2Options = {
          targetDestCode: 'ALL',
          targetDestName: '전체',
          maxPickupDistanceKm: 10,
          minFare: 30000
        };

        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            stage2Options = {
              targetDestCode: parsed.targetDestCode || 'ALL',
              targetDestName: parsed.targetDestName || '전체',
              maxPickupDistanceKm: parsed.maxPickupDistanceKm ?? 10,
              minFare: parsed.minFare ?? 30000
            };
          } catch (e) { }
        }

        startGame({
          chapterCode: groupCode,
          overrideRegions: currentStage === 2 ? fullMapData?.features : targetDongs,
          highlightRegions: [],
          isBasicMode: false,
          ...(currentStage === 2 ? {
            currentLocCode: groupCode,
            currentLocName: feature.properties.name,
            ...stage2Options
          } : {})
        });
        return;
      }

      if (selectionLevel === 'DISTRICT') {
        // 일반구 클릭 -> 바로 PLAYING (4단계)
        const targetDongs = fullMapData?.features.filter((f: any) =>
          f.properties.code.startsWith(code) &&
          !!(f.properties as any)._isEmdGroup
        ) || [];

        // 2단계 설정 불러오기
        const savedSettings = localStorage.getItem('STAGE2_SETTINGS');
        let stage2Options = {
          targetDestCode: 'ALL',
          targetDestName: '전체',
          maxPickupDistanceKm: 10,
          minFare: 30000
        };

        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            stage2Options = {
              targetDestCode: parsed.targetDestCode || 'ALL',
              targetDestName: parsed.targetDestName || '전체',
              maxPickupDistanceKm: parsed.maxPickupDistanceKm ?? 10,
              minFare: parsed.minFare ?? 30000
            };
          } catch (e) { }
        }

        startGame({
          chapterCode: code,
          overrideRegions: currentStage === 2 ? fullMapData?.features : targetDongs,
          highlightRegions: [],
          isBasicMode: false,
          ...(currentStage === 2 ? {
            currentLocCode: code,
            currentLocName: feature.properties.name,
            ...stage2Options
          } : {})
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
      <MapZoomDispatcher
        width={width}
        height={height}
        padding={padding}
        zoomTo={zoomTo}
        mapData={mapData}
        pathGenerator={pathGenerator}
        cityData={cityData}
        level1Data={level1Data}
        selectedChapter={selectedChapter}
      />
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
        <g id="layer-3-interaction-group" ref={gRef}>
          {/* Layer 3: Interaction Layer (투명한 폴리곤들로 사용자 클릭/호버 판정) */}
          <InteractionLayer
            features={featuresToRender}
            pathGenerator={pathGenerator}
            gameState={gameState}
            showTownGeometry={showTownGeometry}
            onRegionHover={setHoveredRegion}
            answeredRegions={answeredRegions}
            onRegionClick={handleRegionClick}
          />

          {/* 2단계 배차 노선 궤적 베지어 곡선 레이어 */}
          <RouteAnimationLayer projection={projection} />

          {/* Hierarchical Boundaries (EMD) Overlay: Rendered underneath hovers but above base map */}
          {highlightRegions && highlightRegions.length > 0 && (
            <g style={{ pointerEvents: 'none' }}>
              {highlightRegions.map((region: any) => (
                <path
                  key={`highlight-${region.properties.code}`}
                  d={pathGenerator(region) || ''}
                  fill="rgba(59, 130, 246, 0.4)"
                  stroke="#3b82f6"
                  strokeWidth={3 / zoomTransform.k}
                  strokeOpacity={1.0}
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

      {/* 2단계 전용: 현위치 선택 모드 안내 문구 */}
      {gameState === 'REGION_SELECT' && currentStage === 2 && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-40 glass-panel border-purple-500/50 text-white px-6 py-3 rounded-2xl shadow-2xl flex flex-col items-center animate-in slide-in-from-top-4 duration-500">
          <span className="text-purple-400 font-bold mb-1">[ 2단계: 실전 배차 필터링 ]</span>
          <span className="text-sm font-mono opacity-90">현재 위치(거점) 지정을 위해 행정구역을 터치하세요.</span>
          <span className="text-[10px] text-gray-400 mt-1">터치한 지역을 중심으로 반경 내 배차 리스트가 생성됩니다.</span>
        </div>
      )}

      {!showTownGeometry && gameState === 'PLAYING' && !forceShowTowns && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 glass-panel text-white px-4 py-2 rounded-full text-xs font-mono">
          [확대하여 지역 탐색]
        </div>
      )}

    </div>
  );
};
