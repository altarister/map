/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
/**
 * BaseMapLayerCanvas — Layer 1: 지역 폴리곤 배경 캔버스
 *
 * 역할:
 *   - 지도의 가장 밑바닥 레이어. 모든 시/군/구/동 영역을 Canvas 2D로 그린다.
 *   - 각 구역을 fill(면색) + stroke(테두리)로 표현한다.
 *   - 게임 상태(미답/정답/힌트)에 따라 각 구역의 색상이 달라진다.
 *   - D3 zoom의 줌/패닝은 두 가지 방식으로 반영된다:
 *       (A) 빠른 pan/zoom 중: CSS transform으로 이미 그려진 Canvas를 밀고 당김
 *       (B) pan/zoom 완료 후: drawCanvas()를 호출해 정확한 좌표로 다시 그림
 *
 * 외부 호출:
 *   - useMapZoom.ts가 ref.draw() / ref.setCssTransform()을 직접 호출한다.
 *   - useLayoutEffect가 상태 변화(정답 처리, 테마 변경 등) 시 자동으로 재그린다.
 */

import { memo, useLayoutEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { geoPath } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import type { RegionFeature } from '../../types/geo';
import type { AnswerFeedback } from '../../types/game';

interface BaseMapLayerCanvasProps {
    features: RegionFeature[];          // 현재 선택된 지역의 동/읍/면 폴리곤 목록
    contextBoundaryFeatures: RegionFeature[]; // 현재 depth에 맞춰 Map.tsx가 계산한 컨텍스트 경계선
    projection: GeoProjection;          // D3 지리좌표 → 픽셀 변환기
    theme: string;                      // 현재 테마 이름 ('tactical' 등)
    themeColors: any;                   // 테마별 기본 fill/stroke 색상 팔레트
    getFillColor: (feature: any, isHovered?: boolean) => string; // 구역 면색 결정 함수
    getStrokeColor: (feature: any, isHovered?: boolean) => string; // 구역 테두리색 결정 함수
    initialTransform: { x: number, y: number, k: number }; // 초기 줌/패닝 상태
    width: number;
    height: number;
    answeredRegions: Set<string>;       // 이미 맞힌 구역 코드 집합
    lastFeedback: AnswerFeedback | null; // 가장 최근 정답/오답 피드백
    showBoundaries: boolean;            // 시 단위 외곽선 표시 여부 (LayerMapPanel 연동)
    isHintActive: boolean;              // 힌트 활성화 여부
    currentQuestionTargetCode?: string; // 현재 출제 구역 코드 (힌트 하이라이트용)
}

/** D3 zoom에서 직접 호출하는 명령형 핸들 인터페이스 */
export interface BaseMapLayerHandle {
    /** zoom/pan 완료 후 호출 → 정확한 좌표로 전체 재렌더 */
    draw: (transform: { x: number, y: number, k: number }) => void;
    /** zoom/pan 도중 호출 → CSS transform만으로 빠르게 시각 반영 */
    setCssTransform: (current: { x: number, y: number, k: number }, start: { x: number, y: number, k: number }) => void;
}

export const BaseMapLayerCanvas = memo(forwardRef<BaseMapLayerHandle, BaseMapLayerCanvasProps>((
    {
        features,
        contextBoundaryFeatures,
        projection,
        theme,
        themeColors,
        getFillColor,
        getStrokeColor,
        initialTransform,
        width,
        height,
        answeredRegions,
        lastFeedback,
        showBoundaries,
        isHintActive,
        currentQuestionTargetCode
    },
    ref
) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    /**
     * CANVAS_SCALE = 2.0
     * Canvas를 뷰포트의 2배 크기로 만들어 두는 이유:
     *   - 줌/패닝 시 새로 그리기 전 잠깐 CSS transform으로 시각을 미리 보정할 때,
     *     캔버스 가장자리가 빈 공간으로 드러나지 않도록 여유 공간을 확보하기 위함.
     */
    const CANVAS_SCALE = 2.0;

    /**
     * drawCanvas — 핵심 렌더 함수
     *
     * 호출 시점:
     *   1. 초기 마운트 시 (useLayoutEffect)
     *   2. zoom/pan이 완료된 시점 (ref.draw()를 통해 D3 zoom이 직접 호출)
     *   3. 게임 상태 변화 시: 정답 처리, 테마 변경, 힌트 활성화 등 (useLayoutEffect deps)
     *
     * 렌더 순서 (Two-Pass 방식):
     *   [설정] Canvas 좌표계를 현재 D3 zoom transform(x, y, k)에 맞게 변환
     *   [Pass1] 모든 구역 면색(fill)만 일괄 그리기
     *   [Pass2] 모든 구역 테두리(stroke)만 일괄 그리기
     *   [Pass3] (선택적) showBoundaries=true면 시/군 단위 굵은 외곽선 추가
     *
     * Two-Pass를 쓰는 이유:
     *   단일 루프(fill → stroke → 다음 구역)로 그리면, 이웃 구역의 fill이
     *   이미 그린 경계선을 덮어씌워 경계선이 들쭉날쭉하게 보이는 렌더 버그가 발생.
     *   → 모든 fill을 먼저 칠한 후 stroke를 한 번에 올리면 균일한 경계선이 보장됨.
     */
    const drawCanvas = (x: number, y: number, k: number) => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        const pixelRatio = window.devicePixelRatio || 1;

        // Canvas가 2배 크므로 중앙에 화면이 오도록 오프셋 계산
        const offsetX = (width * (CANVAS_SCALE - 1)) / 2;
        const offsetY = (height * (CANVAS_SCALE - 1)) / 2;

        ctx.save();
        ctx.scale(pixelRatio, pixelRatio);      // Retina/HiDPI 보정
        ctx.clearRect(0, 0, width * CANVAS_SCALE, height * CANVAS_SCALE); // 이전 프레임 초기화

        // D3 zoom transform 적용: 현재 줌/패닝 상태를 Canvas 좌표계로 반영
        ctx.translate(offsetX, offsetY);
        ctx.translate(x, y);
        ctx.scale(k, k);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // D3 geoPath: GeoJSON 좌표 → Canvas 2D 드로잉 명령으로 변환
        const canvasPath = geoPath(projection).context(ctx);

        // 줌 배율에 반비례하여 선 굵기를 유지 → 어떤 줌 단계에서도 시각적 두께가 일정
        const baseStrokeWidth = 1 / k;

        // ── LOD (Level of Detail): 줌 레벨 기록용 (현재 alpha는 1로 고정)
        const dongAlpha = 1;
        // ─────────────────────────────────────────────────────────────────────

        // ══════════════════════════════════════════════════════════════════
        // Pass 1: FILL (면색 채우기)
        //   - 게임 상태에 따라 각 구역의 fill 색상을 결정하여 그린다.
        //   - 미답 구역: themeColors.fill (배경색, transparent에 가까움)
        //   - 정답 처리된 구역: getFillColor()로 emerald 계열 색상 반환
        //   - 힌트 구역: 반투명 노란색 (rgba(234, 179, 8, 0.4))
        //   - 각 구역의 stroke 색상 정보를 featureStyles에 저장해 Pass2에서 사용
        // ══════════════════════════════════════════════════════════════════
        const featureStyles: { feature: any; strokeColor: string; isTargetHint: boolean }[] = [];

        features.forEach((feature: any) => {
            const code = feature.properties.code;
            const isAnswered = answeredRegions.has(code);
            const isCorrectFeedback = lastFeedback?.regionCode === code && lastFeedback?.isCorrect;
            const isTargetHint = isHintActive && code === currentQuestionTargetCode;

            let fillColor = themeColors.fill;       // 기본: 테마 배경색 (거의 투명)
            let strokeColor = themeColors.stroke;   // 기본: 테마 경계선 색상

            if (isAnswered) {
                // 정답 처리된 구역: orderVolume(주문량)에 따라 에메랄드 계열 색상
                fillColor = getFillColor(feature, false);
                // strokeColor = getStrokeColor(feature, false);
            }
            if (isCorrectFeedback) { /* 정답 피드백 연출 자리 (현재 미사용) */ }
            if (isTargetHint) {
                // 힌트 활성화 시: 출제 구역을 반투명 노란색으로 표시
                fillColor = 'rgba(234, 179, 8, 0.4)';
                // strokeColor = '#eab308';
            }

            ctx.beginPath();
            canvasPath(feature as any);  // GeoJSON → Canvas 경로 생성
            ctx.fillStyle = fillColor;
            ctx.fill();                  // 면색만 칠함 (stroke는 Pass2에서)

            featureStyles.push({ feature, strokeColor, isTargetHint });
        });

        // ══════════════════════════════════════════════════════════════════
        // Pass 2: STROKE (경계선 그리기)
        //   - 모든 fill이 완료된 후 경계선만 한 번에 그린다.
        //   - 일반 구역: baseStrokeWidth (줌 비례 1px), LOD에 따라 dongAlpha 적용
        //   - 힌트 구역: 3px 두꺼운 노란 테두리로 강조 (항상 100% 불투명)
        //   → 이웃 구역의 fill이 경계선을 덮어씌우는 렌더 버그 방지
        // ══════════════════════════════════════════════════════════════════
        featureStyles.forEach(({ feature, strokeColor, isTargetHint }) => {
            console.log('isTargetHint', isTargetHint)
            ctx.beginPath();
            canvasPath(feature as any);
            ctx.lineWidth = 0.3 //isTargetHint ? 3.0 / k : baseStrokeWidth;
            ctx.strokeStyle = strokeColor;              // 순수 hex 색상, 투명도는 globalAlpha로만
            // ctx.globalAlpha = isTargetHint ? 1.0 : dongAlpha; // 힌트는 항상 선명
            ctx.stroke();
        });
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = baseStrokeWidth; // 이후 드로잉을 위해 복원

        // ══════════════════════════════════════════════════════════════════
        // Pass 3: 컨텍스트 경계선 (selectionLevel에 따라 Map.tsx가 계산해서 전달)
        //   - PROVINCE → 전체 시/군/자치구 경계 흐리게
        //   - CITY     → 선택 광역 제외 나머지 광역 단일 외곽 흐리게
        //   - DISTRICT → 선택 도시 제외 동일 광역 시/군 경계 흐리게
        //   - showBoundaries OFF이면 건너뜀
        // ══════════════════════════════════════════════════════════════════
        if (showBoundaries && contextBoundaryFeatures.length > 0) {
            const contextStrokeColor = theme === 'tactical' ? '#707070' : '#879cb9';
            const contextAlpha = 0.35; // 항상 희미하게

            ctx.globalAlpha = contextAlpha;
            contextBoundaryFeatures.forEach((feature: any) => {
                ctx.beginPath();
                canvasPath(feature as any);
                ctx.lineWidth = 1;
                ctx.strokeStyle = contextStrokeColor;
                ctx.stroke();
            });
            ctx.globalAlpha = 1.0; // 복원
        }

        ctx.restore(); // save()와 쌍을 맞춰 transform 상태 복원
    };

    /**
     * useImperativeHandle — D3 zoom에서 직접 호출하는 명령형 인터페이스
     *
     * draw(t):
     *   - zoom/pan 제스처가 "완료"된 후 호출됨 (mouseup, wheel end 등)
     *   - CSS transform을 초기화하고 drawCanvas()로 전체 재렌더
     *   - 정확한 좌표로 선명하게 다시 그리는 "확정 렌더"
     *
     * setCssTransform(current, start):
     *   - zoom/pan 제스처가 "진행 중"일 때 매 프레임 호출됨
     *   - drawCanvas() 없이 CSS transform만으로 시각 반영 → 60fps 부드러운 스크롤
     *   - Canvas를 다시 그리지 않으므로 극도로 빠름 (GPU 가속)
     *   - 단, 줌/패닝 중에는 미세한 픽셀 왜곡이 있음 (허용 범위)
     */
    useImperativeHandle(ref, () => ({
        draw: (t) => {
            if (containerRef.current) {
                containerRef.current.style.transform = `translate(0px, 0px) scale(1)`;
            }
            drawCanvas(t.x, t.y, t.k);
        },
        setCssTransform: (current, start) => {
            if (!containerRef.current) return;
            const S = current.k / start.k;
            const Dx = current.x - start.x * S;
            const Dy = current.y - start.y * S;
            containerRef.current.style.transform = `translate(${Dx}px, ${Dy}px) scale(${S})`;
            containerRef.current.style.transformOrigin = `0 0`;
        }
    }));

    /**
     * useLayoutEffect — React 상태 변화 시 자동 재렌더
     *
     * 언제 실행되나:
     *   - width/height: 브라우저 창 리사이즈
     *   - theme: 사용자가 테마 변경
     *   - features: 게임 코스/구역 변경
     *   - answeredRegions: 정답 처리 시 (에메랄드 채색)
     *   - lastFeedback: 오답/정답 피드백 직후
     *   - showBoundaries: LayerMapPanel 토글
     *   - isHintActive / currentQuestionTargetCode: 힌트 표시
     *
     * useLayoutEffect (vs useEffect):
     *   - DOM paint 전에 실행되므로 화면 깜빡임 없이 Canvas를 준비함
     */
    useLayoutEffect(() => {
        const pixelRatio = window.devicePixelRatio || 1;
        const canvas = canvasRef.current;
        if (canvas) {
            // Canvas 실제 픽셀 크기 = CSS 크기 × pixelRatio × CANVAS_SCALE
            const scaledWidth = width * CANVAS_SCALE;
            const scaledHeight = height * CANVAS_SCALE;
            canvas.width = scaledWidth * pixelRatio;
            canvas.height = scaledHeight * pixelRatio;
            canvas.style.width = `${scaledWidth}px`;
            canvas.style.height = `${scaledHeight}px`;
        }
        drawCanvas(initialTransform.x, initialTransform.y, initialTransform.k);
    }, [width, height, theme, features, answeredRegions, lastFeedback, showBoundaries, isHintActive, currentQuestionTargetCode]);

    /**
     * 렌더 반환: div(wrapper) + canvas
     *
     * div(containerRef):
     *   - setCssTransform()이 이 요소에 CSS transform을 직접 적용
     *   - CANVAS_SCALE=2 이므로 canvas가 더 크지만 overflow:visible로 화면 밖에도 그림
     *   - pointer-events:none → 클릭 이벤트는 위에 있는 InteractionLayer(SVG)가 담당
     *
     * canvas(canvasRef):
     *   - 뷰포트 중앙에 오도록 음수 left/top으로 위치 보정
     *   - 실제 픽셀 그리기는 drawCanvas()에서만 이루어짐
     */
    return (
        <div
            id="layer-1-base-canvas-wrapper"
            ref={containerRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none layer-1-base-map"
            style={{
                width: `${width}px`,
                height: `${height}px`,
                overflow: 'visible',
                willChange: 'transform',   // GPU 레이어 힌트
                transition: 'none',
                zIndex: 0
            }}
        >
            <canvas
                id="layer-1-base-canvas"
                ref={canvasRef}
                className="absolute"
                style={{
                    // CANVAS_SCALE=2 초과분의 절반만큼 음수 offset → 화면 중앙 정렬
                    left: `-${(width * (CANVAS_SCALE - 1)) / 2}px`,
                    top: `-${(height * (CANVAS_SCALE - 1)) / 2}px`,
                    transition: 'none'
                }}
            />
        </div>
    );
}));
