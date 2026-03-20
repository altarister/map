/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
/**
 * SelectionBorderCanvas — 선택한 지역의 외곽선 전용 캔버스 (Canvas 1-2)
 *
 * 역할:
 *   - 현재 "진입한" 지역(경기도, 고양시, 광주시 등)의 테두리만 굵고 선명하게 그린다.
 *   - fill 없이 stroke만 → alpha 복잡도 없이 깔끔한 경계 표시
 *   - BaseMapLayerCanvas(1-1) 위, RoadLayer(2) 아래에 위치
 *
 * selectionLevel별 그리는 대상:
 *   - PROVINCE  → 없음 (아직 아무것도 선택 안 한 상태)
 *   - CITY      → 선택한 광역 외곽 (예: 경기도 단일 폴리곤)
 *   - DISTRICT  → 선택한 시 외곽 (예: 고양시 관련 폴리곤)
 *   - PLAYING   → 게임 진입한 지역 외곽
 */

import { memo, useLayoutEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { geoPath } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import type { RegionFeature } from '../../types/geo';
import type { BaseMapLayerHandle } from './BaseMapLayerCanvas';

interface SelectionBorderCanvasProps {
    features: RegionFeature[];          // 선택된 지역 폴리곤 (stroke만 그림)
    projection: GeoProjection;
    theme: string;
    themeColors: any;                   // 테마 색상 팔레트
    initialTransform: { x: number; y: number; k: number };
    width: number;
    height: number;
}

// BaseMapLayerHandle을 그대로 재사용 (draw + setCssTransform 인터페이스 동일)
export const SelectionBorderCanvas = memo(forwardRef<BaseMapLayerHandle, SelectionBorderCanvasProps>((
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
    // 실제 현재 transform을 추적 (useLayoutEffect에서 최신 위치로 재그릴 때 사용)
    const currentTransformRef = useRef(initialTransform);

    // BaseMapLayerCanvas와 동일한 2× 캔버스 전략 (CSS transform 여유분)
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

        // stroke only — fill 없이 선명한 테두리만
        ctx.strokeStyle = themeColors.stroke;
        ctx.lineWidth = 2 / k;   // base(1/k)보다 두껍게
        ctx.globalAlpha = 1.0;   // 완전 불투명

        features.forEach((feature: any) => {
            ctx.beginPath();
            canvasPath(feature as any);
            ctx.stroke();
        });

        ctx.restore();
    };

    // ── Imperative handle (D3 zoom에서 직접 호출) ────────────────────────────
    useImperativeHandle(ref, () => ({
        draw: (t) => {
            currentTransformRef.current = t; // 실제 transform 저장
            if (containerRef.current) {
                containerRef.current.style.transform = `translate(0px, 0px) scale(1)`;
            }
            drawCanvas(t.x, t.y, t.k);
        },
        setCssTransform: (current, start) => {
            if (!containerRef.current) return;
            // BaseMapLayerCanvas와 동일한 공식 — transformOrigin 0 0 기준
            const S = current.k / start.k;
            const Dx = current.x - start.x * S;  // 스케일 보정 포함
            const Dy = current.y - start.y * S;
            containerRef.current.style.transform = `translate(${Dx}px, ${Dy}px) scale(${S})`;
            containerRef.current.style.transformOrigin = `0 0`;
        },
    }), [features, projection, themeColors, width, height]);

    // ── Layout effect: canvas 크기 설정 + 재그리기 ────────────────────────────
    // features 변경(selectionLevel 클릭) 시에도 CSS transform을 반드시 리셋하고
    // currentTransformRef의 최신 위치로 재그림 → 잔상(이중 오프셋) 방지
    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !width || !height) return;

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = width * CANVAS_SCALE * pixelRatio;
        canvas.height = height * CANVAS_SCALE * pixelRatio;
        canvas.style.width = `${width * CANVAS_SCALE}px`;
        canvas.style.height = `${height * CANVAS_SCALE}px`;

        // CSS transform 잔여분 제거 후 현재 실제 위치로 재그림
        if (containerRef.current) {
            containerRef.current.style.transform = `translate(0px, 0px) scale(1)`;
        }
        const t = currentTransformRef.current;
        drawCanvas(t.x, t.y, t.k);
    }, [width, height, features, themeColors, projection]);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'absolute',
                left: -(width * (CANVAS_SCALE - 1)) / 2,
                top: -(height * (CANVAS_SCALE - 1)) / 2,
                pointerEvents: 'none',
            }}
        >
            <canvas ref={canvasRef} />
        </div>
    );
}));

SelectionBorderCanvas.displayName = 'SelectionBorderCanvas';
