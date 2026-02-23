import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { zoom, zoomIdentity, zoomTransform } from 'd3-zoom';
import type { ZoomBehavior, D3ZoomEvent } from 'd3-zoom';
import { select } from 'd3-selection';
import type { RefObject } from 'react';
import type { RoadLayerHandle } from '../components/game/RoadLayer';

export interface MapTransform {
    x: number;
    y: number;
    k: number;
}

interface UseMapZoomProps {
    width: number;
    height: number;
    onZoom?: (transform: MapTransform) => void;
    minZoom?: number;
    maxZoom?: number;
    roadLayerRef?: RefObject<RoadLayerHandle | null>;
}

// easeInOutQuad
const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

export const useMapZoom = ({
    width,
    height,
    onZoom,
    minZoom = 1,
    maxZoom = 8,
    roadLayerRef,
}: UseMapZoomProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const gRef = useRef<SVGGElement>(null);
    const baseMapGRef = useRef<SVGGElement>(null);

    const [transform, setTransform] = useState<MapTransform>({ x: 0, y: 0, k: 1 });
    const zoomBehavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const animFrameRef = useRef<number | null>(null);

    // onZoom을 ref로 관리 → useEffect 의존성에서 제외해 zoom behavior 재생성 방지
    const onZoomRef = useRef(onZoom);
    useLayoutEffect(() => { onZoomRef.current = onZoom; }, [onZoom]);

    /**
     * DOM과 React 상태를 동시에 업데이트하는 단일 함수.
     * zoom 이벤트 핸들러와 programmatic zoomTo 모두 여기서 처리.
     */
    const applyTransform = useCallback((t: MapTransform) => {
        if (!svgRef.current) return;

        // 1. d3 __zoom 직접 설정 → 이후 wheel/drag 이벤트의 기준점
        (svgRef.current as any).__zoom = zoomIdentity.translate(t.x, t.y).scale(t.k);

        // 2. SVG <g> 레이어 transform 직접 업데이트
        if (gRef.current) {
            gRef.current.setAttribute('transform', `translate(${t.x},${t.y}) scale(${t.k})`);
        }
        if (baseMapGRef.current) {
            baseMapGRef.current.setAttribute('transform', `translate(${t.x},${t.y}) scale(${t.k})`);
        }

        // 3. Road canvas 갱신
        roadLayerRef?.current?.draw(t);

        // 4. React 상태 & 콜백
        setTransform(t);
        onZoomRef.current?.(t);
    }, []); // roadLayerRef는 ref이므로 deps 불필요

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
            .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
                // wheel/drag 이벤트는 d3가 __zoom을 이미 업데이트했으므로
                // DOM 속성 설정 없이 g 요소와 React 상태만 동기화
                const { x, y, k } = event.transform;
                if (gRef.current) {
                    gRef.current.setAttribute('transform', `translate(${x},${y}) scale(${k})`);
                }
                if (baseMapGRef.current) {
                    baseMapGRef.current.setAttribute('transform', `translate(${x},${y}) scale(${k})`);
                }
                roadLayerRef?.current?.draw({ x, y, k });
                setTransform({ x, y, k });
                onZoomRef.current?.({ x, y, k });
            })
            .filter((event) => !event.ctrlKey && event.type !== 'dblclick');

        zoomBehavior.current = newZoom;
        svg.call(newZoom).on('dblclick.zoom', null);

        // 이전 transform 복원
        if (prevT && (prevT.x !== 0 || prevT.y !== 0 || prevT.k !== 1)) {
            const t = { x: prevT.x, y: prevT.y, k: prevT.k };
            applyTransform(t);
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
     * 부드러운 줌 애니메이션. applyTransform으로 매 프레임 DOM + React 상태 동기화.
     */
    const zoomTo = useCallback((t: MapTransform, duration = 750) => {
        if (!svgRef.current) return;

        if (animFrameRef.current !== null) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }

        if (duration <= 0) {
            applyTransform(t);
            return;
        }

        const currentT = zoomTransform(svgRef.current);
        const sx = currentT.x, sy = currentT.y, sk = currentT.k;
        const { x: ex, y: ey, k: ek } = t;
        const startTime = performance.now();

        const tick = (now: number) => {
            if (!svgRef.current) return;
            const progress = Math.min((now - startTime) / duration, 1);
            applyTransform({
                x: sx + (ex - sx) * ease(progress),
                y: sy + (ey - sy) * ease(progress),
                k: sk + (ek - sk) * ease(progress),
            });
            if (progress < 1) {
                animFrameRef.current = requestAnimationFrame(tick);
            } else {
                animFrameRef.current = null;
            }
        };

        animFrameRef.current = requestAnimationFrame(tick);
    }, [applyTransform]);

    return { svgRef, gRef, baseMapGRef, transform, zoomTo };
};
