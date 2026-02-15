import { useEffect, useRef, useState } from 'react';
import { zoom } from 'd3-zoom';
import type { ZoomBehavior, D3ZoomEvent } from 'd3-zoom';
import { select } from 'd3-selection';

interface Transform {
    x: number;
    y: number;
    k: number;
}

interface UseMapZoomProps {
    width: number;
    height: number;
    onZoom?: (transform: Transform) => void;
    minZoom?: number;
    maxZoom?: number;
}

export const useMapZoom = ({
    width,
    height,
    onZoom,
    minZoom = 1,
    maxZoom = 8
}: UseMapZoomProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const gRef = useRef<SVGGElement>(null);
    const baseMapGRef = useRef<SVGGElement>(null);

    const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 });
    const zoomBehavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

    useEffect(() => {
        if (!svgRef.current || width === 0 || height === 0) return;

        const svg = select(svgRef.current);
        const g = gRef.current ? select(gRef.current) : null;
        const baseMapG = baseMapGRef.current ? select(baseMapGRef.current) : null;

        zoomBehavior.current = zoom<SVGSVGElement, unknown>()
            .scaleExtent([minZoom, maxZoom])
            .extent([[0, 0], [width, height]])
            .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
                const { x, y, k } = event.transform;

                // Direct DOM manipulation for performance (Sync layers)
                if (g) g.attr('transform', `translate(${x},${y}) scale(${k})`);
                if (baseMapG) baseMapG.attr('transform', `translate(${x},${y}) scale(${k})`);

                // State update for React (optional, for other UI)
                setTransform({ x, y, k });

                // IMPORTANT: Pass full transform so parent can sync Context
                if (onZoom) onZoom({ x, y, k });
            })
            .filter((event) => !event.ctrlKey && event.type !== 'dblclick');

        svg.call(zoomBehavior.current)
            .on("dblclick.zoom", null);

        return () => {
            svg.on('.zoom', null);
        };

    }, [width, height, minZoom, maxZoom, onZoom]);

    return { svgRef, gRef, baseMapGRef, transform };
};
