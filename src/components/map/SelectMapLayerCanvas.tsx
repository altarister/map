/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
/**
 * SelectMapLayerCanvas — 선택된 진입 지역의 "단일 통합 외곽선" 전용 액자 캔버스 (Canvas 1-2)
 *
 * 역할:
 *   - BaseMapLayerCanvas(1-1) 위에 그려져, 내부 조각들의 공유 경계선이 만드는
 *     가장자리의 불규칙하고 겹친 선들을 완벽하게 덮어버림.
 *   - 굵고 불투명한 단일 선(Stroke)을 통해 "이 안쪽 공간이 현재 스테이지"라는
 *     시각적 Frame 효과 제공.
 */

import { memo, useLayoutEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { geoPath } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import type { RegionFeature } from '../../types/geo';
import type { BaseMapLayerHandle } from './BaseMapLayerCanvas';

interface SelectMapLayerCanvasProps {
    features: RegionFeature[];          // 1개의 단일 "통합" 폴리곤만 들어옴 (stroke만 렌더링)
    projection: GeoProjection;
    theme: string;
    themeColors: any;
    initialTransform: { x: number; y: number; k: number };
    width: number;
    height: number;
}

export const SelectMapLayerCanvas = memo(forwardRef<BaseMapLayerHandle, SelectMapLayerCanvasProps>((
    {
        features,
        projection,
        themeColors,
        initialTransform,
        width,
        height,
    },
    ref
) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const currentTransformRef = useRef(initialTransform);

    // CSS transform 여유공간 확보를 위한 2배율 캔버스
    const CANVAS_SCALE = 2.0;

    const drawCanvas = (x: number, y: number, k: number) => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx || !width || !height) return;

        const pixelRatio = window.devicePixelRatio || 1;
        const offsetX = (width * (CANVAS_SCALE - 1)) / 2;
        const offsetY = (height * (CANVAS_SCALE - 1)) / 2;

        ctx.save();
        ctx.scale(pixelRatio, pixelRatio);
        ctx.clearRect(0, 0, width * CANVAS_SCALE, height * CANVAS_SCALE);

        if (features.length === 0) {
            ctx.restore();
            return;
        }

        ctx.translate(offsetX, offsetY);
        ctx.translate(x, y);
        ctx.scale(k, k);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const canvasPath = geoPath(projection).context(ctx);

        // Frame 속성: fill 없이 선만, 불투명도 100%, Base보다 2배 두꺼움
        ctx.strokeStyle = themeColors.stroke;
        ctx.lineWidth = 1.5 //2.5 / k; 
        ctx.globalAlpha = 1.0; 

        features.forEach((feature: any) => {
            ctx.beginPath();
            canvasPath(feature as any);
            ctx.stroke();
        });

        ctx.restore();
    };

    useImperativeHandle(ref, () => ({
        draw: (t) => {
            currentTransformRef.current = t;
            if (containerRef.current) {
                containerRef.current.style.transform = `translate(0px, 0px) scale(1)`;
            }
            drawCanvas(t.x, t.y, t.k);
        },
        setCssTransform: (current, start) => {
            if (!containerRef.current) return;
            // BaseMapLayerCanvas와 완벽히 동일한 수학 공식 적용하여 어긋남(잔상) 방지
            const S = current.k / start.k;
            const Dx = current.x - start.x * S;
            const Dy = current.y - start.y * S;
            containerRef.current.style.transform = `translate(${Dx}px, ${Dy}px) scale(${S})`;
            containerRef.current.style.transformOrigin = `0 0`;
        },
    }), [features, projection, themeColors, width, height]);

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !width || !height) return;

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = width * CANVAS_SCALE * pixelRatio;
        canvas.height = height * CANVAS_SCALE * pixelRatio;
        canvas.style.width = `${width * CANVAS_SCALE}px`;
        canvas.style.height = `${height * CANVAS_SCALE}px`;

        if (containerRef.current) {
            containerRef.current.style.transform = `translate(0px, 0px) scale(1)`;
        }
        const t = currentTransformRef.current;
        drawCanvas(t.x, t.y, t.k);
    }, [width, height, features, themeColors, projection]);

    return (
        <div
            id="layer-1-2-select-canvas-wrapper"
            ref={containerRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none layer-1-select-map"
            style={{
                width: `${width}px`,
                height: `${height}px`,
                overflow: 'visible',
                willChange: 'transform',
                transition: 'none',
                zIndex: 1
            }}
        >
            <canvas
                id="layer-1-2-select-canvas"
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


SelectMapLayerCanvas.displayName = 'SelectMapLayerCanvas';
