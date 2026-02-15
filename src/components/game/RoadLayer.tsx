import { memo, useLayoutEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { geoPath } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import { quadtree } from 'd3-quadtree';
import type { Feature } from 'geojson';

interface RoadLayerProps {
    features: Feature[];
    projection: GeoProjection;
    transform: { x: number, y: number, k: number };
    width: number;
    height: number;
}

export interface RoadLayerHandle {
    draw: (transform: { x: number, y: number, k: number }) => void;
}

export const RoadLayer = memo(forwardRef<RoadLayerHandle, RoadLayerProps>(({ features, projection, transform, width, height }, ref) => {
    // Wrapper Ref for CSS Transform
    const containerRef = useRef<HTMLDivElement>(null);
    const lastDrawTransform = useRef<{ x: number, y: number, k: number } | null>(null);

    // 5 Separate Canvases
    const canvasMotorwayRef = useRef<HTMLCanvasElement>(null);
    const canvasTrunkRef = useRef<HTMLCanvasElement>(null);
    const canvasPrimaryRef = useRef<HTMLCanvasElement>(null);
    const canvasSecondaryRef = useRef<HTMLCanvasElement>(null);
    const canvasOtherRef = useRef<HTMLCanvasElement>(null);

    const CANVAS_SCALE = 2.0;

    // 1. Spatial Indexing: Build Quadtree
    const boundsGenerator = useMemo(() => geoPath(projection), [projection]);

    const tree = useMemo(() => {
        if (!features || features.length === 0) return null;

        const q = quadtree<any>()
            .x(d => d.centroid[0])
            .y(d => d.centroid[1]);

        const data = features.map(f => {
            const centroid = boundsGenerator.centroid(f as any);
            return {
                feature: f,
                centroid: centroid,
                bounds: boundsGenerator.bounds(f as any)
            };
        });

        q.addAll(data);
        return q;
    }, [features, boundsGenerator]);

    // Internal Draw Helper - The Heavy Lifting
    const drawCanvas = (x: number, y: number, k: number) => {
        const ctxM = canvasMotorwayRef.current?.getContext('2d');
        const ctxT = canvasTrunkRef.current?.getContext('2d');
        const ctxP = canvasPrimaryRef.current?.getContext('2d');
        const ctxS = canvasSecondaryRef.current?.getContext('2d');
        const ctxO = canvasOtherRef.current?.getContext('2d');

        if (!ctxM || !ctxT || !ctxP || !ctxS || !ctxO || !tree) return;

        lastDrawTransform.current = { x, y, k };

        const pixelRatio = window.devicePixelRatio || 1;

        const offsetX = (width * (CANVAS_SCALE - 1)) / 2;
        const offsetY = (height * (CANVAS_SCALE - 1)) / 2;

        const contexts = [ctxM, ctxT, ctxP, ctxS, ctxO];
        contexts.forEach(ctx => {
            ctx.save();
            ctx.scale(pixelRatio, pixelRatio);
            ctx.clearRect(0, 0, width * CANVAS_SCALE, height * CANVAS_SCALE);

            // Critical Point: 
            // SVG uses transform="translate(x,y) scale(k)"
            // Canvas needs to match this EXACTLY.
            // 1. Center viewport in our expanded canvas
            ctx.translate(offsetX, offsetY);

            // 2. Apply Map Transform
            ctx.translate(x, y);
            ctx.scale(k, k);

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        });

        // Projection logic needs to match
        const localProjection = (projection as any).copy ? (projection as any).copy().clipExtent(null) : projection;
        const canvasPath = geoPath(localProjection);

        // Inverse transform for culling
        // px = (world_x * k) + x + offsetX
        // world_x = (px - x - offsetX) / k ??
        // Wait, standard D3 transform is: screen_x = world_x * k + tx
        const invertX = (px: number) => (px - x) / k;
        const invertY = (py: number) => (py - y) / k;

        // Visible viewport in World Coordinates (relative to projection center/scale 1)
        // We draw into a canvas of size width*2, height*2. 
        // We want to draw everything that *could* be visible in that area.
        // Canvas (0,0) corresponds to screen (-offsetX, -offsetY)
        // Canvas (w*2, h*2) corresponds to screen (width+offsetX, height+offsetY)
        const vp = {
            x0: invertX(-offsetX),
            y0: invertY(-offsetY),
            x1: invertX(width + offsetX),
            y1: invertY(height + offsetY)
        };

        const vpWidth = (width / k);
        const vpHeight = (height / k);
        const cullBuffer = Math.max(vpWidth, vpHeight) * 0.5;

        tree.visit((node, x1, y1, x2, y2) => {
            if (x1 > vp.x1 + cullBuffer || x2 < vp.x0 - cullBuffer || y1 > vp.y1 + cullBuffer || y2 < vp.y0 - cullBuffer) return true;
            if (!node.length) {
                let d = (node as any).data;
                while (d) {
                    const { feature, bounds } = d;
                    const [[bx0, by0], [bx1, by1]] = bounds;
                    const type = feature.properties?.highway;

                    let targetCtx = null;
                    let minK = 0;
                    let color = '';
                    let lineWidth = 0;

                    switch (type) {
                        case 'motorway':
                            targetCtx = ctxM; minK = 0; color = '#f6893b'; lineWidth = 1.8; break;
                        case 'trunk':
                            targetCtx = ctxT; minK = 1.2; color = '#fbbf24'; lineWidth = 1.5; break;
                        case 'primary':
                            targetCtx = ctxP; minK = 1.8; color = '#ffffff'; lineWidth = 1.2; break;
                        case 'secondary':
                            targetCtx = ctxS; minK = 2.5; color = '#9ca3af'; lineWidth = 0.9; break;
                        default:
                            targetCtx = ctxO; minK = 2.5; color = '#4b5563'; lineWidth = 0.6; break;
                    }

                    if (targetCtx && k >= minK) {
                        if (bx1 >= vp.x0 - cullBuffer && bx0 <= vp.x1 + cullBuffer && by1 >= vp.y0 - cullBuffer && by0 <= vp.y1 + cullBuffer) {
                            targetCtx.beginPath();
                            canvasPath.context(targetCtx);
                            canvasPath(feature as any);
                            targetCtx.lineWidth = lineWidth;
                            targetCtx.strokeStyle = color;
                            targetCtx.stroke();
                        }
                    }
                    d = d.next;
                }
            }
            return false;
        });

        contexts.forEach(ctx => ctx.restore());
    };

    // Imperative Handle for Sync Updates (D3 Zoom)
    useImperativeHandle(ref, () => ({
        draw: (t) => {
            // Force synchronous draw
            drawCanvas(t.x, t.y, t.k);
        }
    }), [width, height, tree, projection]);

    // Initial Draw (LayoutEffect to match initial render)
    useLayoutEffect(() => {
        const pixelRatio = window.devicePixelRatio || 1;
        const refs = [canvasMotorwayRef, canvasTrunkRef, canvasPrimaryRef, canvasSecondaryRef, canvasOtherRef];
        const scaledWidth = width * CANVAS_SCALE;
        const scaledHeight = height * CANVAS_SCALE;

        refs.forEach(ref => {
            const canvas = ref.current;
            if (canvas) {
                canvas.width = scaledWidth * pixelRatio;
                canvas.height = scaledHeight * pixelRatio;
                canvas.style.width = `${scaledWidth}px`;
                canvas.style.height = `${scaledHeight}px`;
            }
        });
        drawCanvas(transform.x, transform.y, transform.k);
    }, [width, height]); // Re-init on resize

    // NOTE: We do NOT use useEffect(draw) for 'transform' prop anymore.
    // Why? Because 'transform' prop updates async via React state.
    // d3-zoom calls ref.current.draw() synchronously.
    // If we also draw on prop change, we double-draw or draw stale frames.
    // However, we MUST draw if the road data (tree) loads for the first time while transformed.
    useLayoutEffect(() => {
        drawCanvas(transform.x, transform.y, transform.k);
    }, [tree]);

    return (
        <div
            ref={containerRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{
                width: `${width}px`,
                height: `${height}px`,
                overflow: 'visible',
                // Important: HW Acceleration hints
                willChange: 'transform',
                transition: 'none'
            }}
        >
            {[
                { ref: canvasOtherRef, z: 10, o: 0.1 },
                { ref: canvasSecondaryRef, z: 11, o: 0.2 },
                { ref: canvasPrimaryRef, z: 12, o: 0.2 },
                { ref: canvasTrunkRef, z: 13, o: 0.1 },
                { ref: canvasMotorwayRef, z: 14, o: 0.1 }
            ].map(({ ref, z, o }, i) => (
                <canvas
                    key={i}
                    ref={ref}
                    className="absolute"
                    style={{
                        zIndex: z,
                        opacity: o,
                        left: `-${(CANVAS_SCALE - 1) * 50}%`,
                        top: `-${(CANVAS_SCALE - 1) * 50}%`,
                        transition: 'none'
                    }}
                />
            ))}
        </div>
    );
}));
