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
    initialTransform: { x: number, y: number, k: number };
    width: number;
    height: number;
    answeredRegions: Set<string>;
    lastFeedback: AnswerFeedback | null;
    showBoundaries: boolean;
}

export interface BaseMapLayerHandle {
    draw: (transform: { x: number, y: number, k: number }) => void;
    setCssTransform: (current: { x: number, y: number, k: number }, start: { x: number, y: number, k: number }) => void;
}

export const BaseMapLayerCanvas = memo(forwardRef<BaseMapLayerHandle, BaseMapLayerCanvasProps>(({
    features,
    // cityData, // Unused due to commenting out Level 2 Context Borders
    projection,
    theme,
    themeColors,
    initialTransform, // Used only for initial draw
    width,
    height,
    answeredRegions,
    lastFeedback,
    showBoundaries
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
        const localProjection = (projection as any).copy ? (projection as any).copy().clipExtent(null) : projection;
        const canvasPath = geoPath(localProjection).context(ctx);

        // Base line width adjusts to zoom level so it stays crisp but thin
        const baseStrokeWidth = 1 / k;

        // 1. Draw Active Game Layer (features)
        features.forEach((feature: any) => {
            const code = feature.properties.code;
            const isAnswered = answeredRegions.has(code);
            const isCorrectFeedback = lastFeedback?.regionCode === code && lastFeedback?.isCorrect;

            let fillColor = themeColors.fill;
            let strokeColor = themeColors.stroke;

            if (isAnswered) {
                fillColor = themeColors.answeredFill;
                strokeColor = themeColors.answeredStroke;
            }
            if (isCorrectFeedback) {
                fillColor = themeColors.correctFill;
                strokeColor = themeColors.correctStroke;
            }

            ctx.beginPath();
            canvasPath(feature as any);
            ctx.fillStyle = fillColor;
            ctx.fill();

            ctx.lineWidth = baseStrokeWidth;
            ctx.strokeStyle = strokeColor;
            ctx.stroke();
        });

        // 2. Draw Context Layer: Level 2 Borders
        /* PM 요청: 상세 코스 캔버스 외곽선(시 태두리) 가리기 테스트 
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
        */

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
    }, [width, height, theme, features, answeredRegions, lastFeedback, showBoundaries]);

    return (
        <div
            ref={containerRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
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
                ref={canvasRef}
                className="absolute"
                style={{
                    left: `-${(CANVAS_SCALE - 1) * 50}%`,
                    top: `-${(CANVAS_SCALE - 1) * 50}%`,
                    transition: 'none'
                }}
            />
        </div>
    );
}));
