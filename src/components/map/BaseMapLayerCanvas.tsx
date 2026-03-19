/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { memo, useLayoutEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { geoPath } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import type { RegionFeature } from '../../types/geo';
import type { AnswerFeedback } from '../../types/game';

interface BaseMapLayerCanvasProps {
    features: RegionFeature[];
    cityData: { features: RegionFeature[] } | null;
    projection: GeoProjection;
    theme: string;
    themeColors: any;
    getFillColor: (feature: any, isHovered?: boolean) => string;
    getStrokeColor: (feature: any, isHovered?: boolean) => string;
    initialTransform: { x: number, y: number, k: number };
    width: number;
    height: number;
    answeredRegions: Set<string>;
    lastFeedback: AnswerFeedback | null;
    showBoundaries: boolean;
    isHintActive: boolean;
    currentQuestionTargetCode?: string;
}

export interface BaseMapLayerHandle {
    draw: (transform: { x: number, y: number, k: number }) => void;
    setCssTransform: (current: { x: number, y: number, k: number }, start: { x: number, y: number, k: number }) => void;
}

export const BaseMapLayerCanvas = memo(forwardRef<BaseMapLayerHandle, BaseMapLayerCanvasProps>(({
    features,
    cityData, // Unused due to commenting out Level 2 Context Borders
    projection,
    theme,
    themeColors,
    getFillColor,
    getStrokeColor,
    initialTransform, // Used only for initial draw
    width,
    height,
    answeredRegions,
    lastFeedback,
    showBoundaries,
    isHintActive,
    currentQuestionTargetCode
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const CANVAS_SCALE = 2.0;

    const drawCanvas = (x: number, y: number, k: number) => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        const pixelRatio = window.devicePixelRatio || 1;
        const offsetX = (width * (CANVAS_SCALE - 1)) / 2;
        const offsetY = (height * (CANVAS_SCALE - 1)) / 2;

        ctx.save();
        ctx.scale(pixelRatio, pixelRatio);
        ctx.clearRect(0, 0, width * CANVAS_SCALE, height * CANVAS_SCALE);

        ctx.translate(offsetX, offsetY);
        ctx.translate(x, y);
        ctx.scale(k, k);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // We must configure a D3 GeoPath to draw to this context
        // Ensure we use the exact identical projection object as the SVG layer
        const canvasPath = geoPath(projection).context(ctx);

        // Base line width adjusts to zoom level so it stays crisp but thin
        const baseStrokeWidth = 1 / k;

        // ── TWO-PASS RENDERING ──────────────────────────────────────────
        // Pass 1: 모든 구역 면색(fill)만 먼저 채우기
        //   → 이후 Pass2 stroke가 이웃 구역 fill에 덮이지 않도록 방지
        // Pass 2: 모든 구역 테두리(stroke)를 한 번에 그리기
        //   → 모든 경계선이 동일한 두께/스타일로 균일하게 렌더링됨
        // ────────────────────────────────────────────────────────────────

        // --- Pass 1: FILL ONLY ---
        // 각 구역의 색상 정보를 수집하며 fill만 수행
        const featureStyles: { feature: any; strokeColor: string; isTargetHint: boolean }[] = [];

        features.forEach((feature: any) => {
            const code = feature.properties.code;
            const isAnswered = answeredRegions.has(code);
            const isCorrectFeedback = lastFeedback?.regionCode === code && lastFeedback?.isCorrect;
            const isTargetHint = isHintActive && code === currentQuestionTargetCode;

            let fillColor = themeColors.fill;
            let strokeColor = themeColors.stroke;

            if (isAnswered) {
                fillColor = getFillColor(feature, false);
                strokeColor = getStrokeColor(feature, false);
            }
            if (isCorrectFeedback) { /* reserved */ }
            if (isTargetHint) {
                fillColor = 'rgba(234, 179, 8, 0.4)';
                strokeColor = '#eab308';
            }

            ctx.beginPath();
            canvasPath(feature as any);
            ctx.fillStyle = fillColor;
            ctx.fill();

            // stroke 정보는 Pass2를 위해 보관
            featureStyles.push({ feature, strokeColor, isTargetHint });
        });

        // --- Pass 2: STROKE ONLY ---
        // 모든 fill이 완료된 뒤 테두리선만 그리기 → 균일한 경계선 보장
        featureStyles.forEach(({ feature, strokeColor, isTargetHint }) => {
            ctx.beginPath();
            canvasPath(feature as any);
            ctx.lineWidth = isTargetHint ? 3.0 / k : baseStrokeWidth;
            ctx.strokeStyle = strokeColor;
            ctx.stroke();
        });
        // 선 굵기 복원
        ctx.lineWidth = baseStrokeWidth;

        // 2. Draw Context Layer: Level 2 Borders
        /* PM 요청: 상세 코스 캔버스 외곽선(시 태두리) 가리기 테스트 */
        if (showBoundaries && cityData) {
            const contextStrokeWidth = theme === 'tactical' ? 2.0 / k : 1.5 / k;
            const contextStrokeColor = theme === 'tactical' ? 'rgba(255,255,255,0.3)' : '#64748b';

            cityData.features.forEach((feature: any) => {
                const isActiveSector = features.some((f: any) => f.properties.code.startsWith(feature.properties.code));

                ctx.beginPath();
                canvasPath(feature as any);
                ctx.lineWidth = contextStrokeWidth;
                ctx.strokeStyle = contextStrokeColor;
                // emulate opacity with globalAlpha
                ctx.globalAlpha = isActiveSector ? 1 : 0.15;
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            });
        }
        

        ctx.restore();
    };

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

    useLayoutEffect(() => {
        const pixelRatio = window.devicePixelRatio || 1;
        const canvas = canvasRef.current;
        if (canvas) {
            const scaledWidth = width * CANVAS_SCALE;
            const scaledHeight = height * CANVAS_SCALE;
            canvas.width = scaledWidth * pixelRatio;
            canvas.height = scaledHeight * pixelRatio;
            canvas.style.width = `${scaledWidth}px`;
            canvas.style.height = `${scaledHeight}px`;
        }
        drawCanvas(initialTransform.x, initialTransform.y, initialTransform.k);
    }, [width, height, theme, features, answeredRegions, lastFeedback, showBoundaries, isHintActive, currentQuestionTargetCode]);

    return (
        <div
            id="layer-1-base-canvas-wrapper"
            ref={containerRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none layer-1-base-map"
            style={{
                width: `${width}px`,
                height: `${height}px`,
                overflow: 'visible',
                willChange: 'transform',
                transition: 'none',
                zIndex: 0
            }}
        >
            <canvas
                id="layer-1-base-canvas"
                ref={canvasRef}
                className="absolute"
                style={{
                    left: `-${(width * (CANVAS_SCALE - 1)) / 2}px`,
                    top: `-${(height * (CANVAS_SCALE - 1)) / 2}px`,
                    transition: 'none'
                }}
            />
        </div>
    );
}));
