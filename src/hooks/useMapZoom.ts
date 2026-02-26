import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { zoom, zoomIdentity, zoomTransform } from 'd3-zoom';
import type { ZoomBehavior, D3ZoomEvent } from 'd3-zoom';
import { select } from 'd3-selection';
import type { RefObject } from 'react';
import type { CanvasLayerHandle } from '../types/canvas';

export interface MapTransform {
    x: number;
    y: number;
    k: number;
}

interface UseMapZoomProps {
    width: number;
    height: number;
    onZoom?: (transform: MapTransform) => void;
    onZoomStart?: () => void;
    /** 사용자 손가락이 떼어지고 관성 스크롤이 시작될 때 호출 */
    onMomentumStart?: () => void;
    /** 줌 보간이 끝나고 해상도를 다시 그리기 직전에 호출 (DOM 스냅샷용) */
    onCrossfadeStart?: () => void;
    minZoom?: number;
    maxZoom?: number;
    /** draw() / setCssTransform()을 구현하는 Canvas 레이어 refs. 순서대로 제어됩니다. */
    canvasLayerRefs?: RefObject<CanvasLayerHandle | null>[];
}

// easeInOutQuad
const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

export const useMapZoom = ({
    width,
    height,
    onZoom,
    onZoomStart,
    onMomentumStart,
    onCrossfadeStart,
    minZoom = 1,
    maxZoom = 8,
    canvasLayerRefs = [],
}: UseMapZoomProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const gRef = useRef<SVGGElement>(null);

    const [transform, setTransform] = useState<MapTransform>({ x: 0, y: 0, k: 1 });
    const zoomBehavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const lastDrawnTransformRef = useRef<MapTransform>({ x: 0, y: 0, k: 1 });

    // onZoom, onZoomStart을 ref로 관리 → useEffect 의존성에서 제외해 zoom behavior 재생성 방지
    const onZoomRef = useRef(onZoom);
    useLayoutEffect(() => { onZoomRef.current = onZoom; }, [onZoom]);

    const onZoomStartRef = useRef(onZoomStart);
    useLayoutEffect(() => { onZoomStartRef.current = onZoomStart; }, [onZoomStart]);

    // onMomentumStart, onCrossfadeStart를 ref로 관리
    const onMomentumStartRef = useRef(onMomentumStart);
    const onCrossfadeStartRef = useRef(onCrossfadeStart);
    useLayoutEffect(() => { 
        onMomentumStartRef.current = onMomentumStart; 
        onCrossfadeStartRef.current = onCrossfadeStart;
    }, [onMomentumStart, onCrossfadeStart]);

    // canvasLayerRefs를 ref로 관리 → useCallback 의존성에서 제외
    const canvasLayerRefsRef = useRef(canvasLayerRefs);
    useLayoutEffect(() => { canvasLayerRefsRef.current = canvasLayerRefs; }, [canvasLayerRefs]);

    // 관성 감지용 디바운스 타이머 ref
    const momentumTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMomentumRef = useRef(false);

    /**
     * DOM CSS만 업데이트 (줌 이벤트 도중 호출, 애니메이션 중 60fps 보장)
     */
    const applyCssTransform = useCallback((t: MapTransform) => {
        if (!svgRef.current) return;

        // 1. d3 __zoom 직접 설정 → 이후 wheel/drag 이벤트의 기준점
        (svgRef.current as any).__zoom = zoomIdentity.translate(t.x, t.y).scale(t.k);

        // 2. SVG <g> 레이어 transform 직접 업데이트
        if (gRef.current) {
            gRef.current.style.transform = `translate(${t.x}px,${t.y}px) scale(${t.k})`;
        }

        // 3. 모든 Canvas 레이어 CSS 스케일 갱신 (리렌더링 없음)
        canvasLayerRefsRef.current.forEach(ref => {
            ref.current?.setCssTransform(t, lastDrawnTransformRef.current);
        });
    }, []);

    /**
     * 완전한 그리기 및 React State 업데이트 (줌 종료 시 호출)
     */
    const applyFullTransform = useCallback((t: MapTransform) => {
        applyCssTransform(t);

        lastDrawnTransformRef.current = t;

        // 모든 Canvas 레이어 완전 재드로우
        canvasLayerRefsRef.current.forEach(ref => {
            ref.current?.draw(t);
        });

        setTransform(t);
        onZoomRef.current?.(t);
    }, [applyCssTransform]);

    // zoom behavior 초기화 / 크기 변경 시 재생성
    useEffect(() => {
        if (!svgRef.current || width === 0 || height === 0) return;

        const svgNode = svgRef.current;
        const svg = select(svgNode);

        // 재생성 전 현재 transform 보존
        const prevT = zoomBehavior.current ? zoomTransform(svgNode) : null;

        const newZoom = zoom<SVGSVGElement, unknown>()
            .scaleExtent([minZoom, maxZoom])
            .extent([[0, 0], [width, height]])
            .on('start', () => {
                onZoomStartRef.current?.();
            })
            .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
                const { x, y, k } = event.transform;
                applyCssTransform({ x, y, k });
                // Canvas 레이어는 imperative draw()로만 제어되므로 rerender 없이
                // React state만 업데이트 → 라벨이 매 프레임 정확한 위치로 추적됨
                setTransform({ x, y, k });

                // 관성 감지: wheel 이벤트가 80ms간 오지 않으면 손가락을 뗀 것으로 간주
                if (momentumTimerRef.current) clearTimeout(momentumTimerRef.current);
                isMomentumRef.current = false;
                momentumTimerRef.current = setTimeout(() => {
                    isMomentumRef.current = true;
                    onMomentumStartRef.current?.();
                }, 80);
            })
            .on('end', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
                const { x, y, k } = event.transform;

                // 관성 타이머 정리
                if (momentumTimerRef.current) {
                    clearTimeout(momentumTimerRef.current);
                    momentumTimerRef.current = null;
                }
                isMomentumRef.current = false;

                // 해상도 렌더링 시작 전 스냅샷 크로스페이드 콜백 발동
                onCrossfadeStartRef.current?.();

                applyFullTransform({ x, y, k });
            })
            .filter((event) => !event.ctrlKey && event.type !== 'dblclick');

        zoomBehavior.current = newZoom;
        svg.call(newZoom).on('dblclick.zoom', null);

        // 이전 transform 복원
        if (prevT && (prevT.x !== 0 || prevT.y !== 0 || prevT.k !== 1)) {
            const t = { x: prevT.x, y: prevT.y, k: prevT.k };
            applyFullTransform(t);
        }

        return () => {
            // zoom event listener 제거 + 진행 중 rAF 취소
            svg.on('.zoom', null);
            if (animFrameRef.current !== null) {
                cancelAnimationFrame(animFrameRef.current);
                animFrameRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width, height, minZoom, maxZoom]);

    /**
     * 부드러운 줌 애니메이션. applyCssTransform으로 매 프레임 DOM 상태만 동기화하고 마지막에 State 반영.
     */
    const zoomTo = useCallback((t: MapTransform, duration = 750) => {
        if (!svgRef.current) return;

        if (animFrameRef.current !== null) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }

        if (duration <= 0) {
            applyFullTransform(t);
            return;
        }

        const currentT = zoomTransform(svgRef.current);
        const sx = currentT.x, sy = currentT.y, sk = currentT.k;
        const { x: ex, y: ey, k: ek } = t;
        const startTime = performance.now();

        const tick = (now: number) => {
            if (!svgRef.current) return;
            const progress = Math.min((now - startTime) / duration, 1);

            const currentFrameT = {
                x: sx + (ex - sx) * ease(progress),
                y: sy + (ey - sy) * ease(progress),
                k: sk + (ek - sk) * ease(progress),
            };

            applyCssTransform(currentFrameT);

            if (progress < 1) {
                animFrameRef.current = requestAnimationFrame(tick);
            } else {
                animFrameRef.current = null;
                applyFullTransform(currentFrameT);
            }
        };

        animFrameRef.current = requestAnimationFrame(tick);
    }, [applyCssTransform, applyFullTransform]);

    return { svgRef, gRef, transform, zoomTo };
};
