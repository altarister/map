import { memo, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
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
    const canvasRef = useRef<HTMLCanvasElement>(null);
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

    // 2. Rendering Function
    useImperativeHandle(ref, () => ({
        draw: (currentTransform) => {
            const canvas = canvasRef.current;
            if (!canvas || !tree) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Use passed transform, NOT prop transform (for sync updates)
            const { x, y, k } = currentTransform;

            // High DPI Support
            const pixelRatio = window.devicePixelRatio || 1;
            // Only update width/height if changed (avoid flicker/re-layout if possible?)
            // Actually, width/height prop changes render cycle, so this runs in useEffect too.
            // But 'draw' runs frequently. We assume canvas size is stable during zoom.

            // Setup Transform
            ctx.save();
            ctx.scale(pixelRatio, pixelRatio);
            ctx.clearRect(0, 0, width, height);

            ctx.translate(x, y);
            ctx.scale(k, k);

            // Path Generator
            const canvasPath = geoPath(projection).context(ctx);

            // Viewport Culling
            const invertX = (px: number) => (px - x) / k;
            const invertY = (py: number) => (py - y) / k;

            const vp = {
                x0: invertX(0),
                y0: invertY(0),
                x1: invertX(width),
                y1: invertY(height)
            };

            const buffer = 50 / k;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            tree.visit((node, x1, y1, x2, y2) => {
                if (x1 > vp.x1 + buffer || x2 < vp.x0 - buffer || y1 > vp.y1 + buffer || y2 < vp.y0 - buffer) return true;

                if (!node.length) {
                    let d = (node as any).data;
                    while (d) {
                        const { feature, bounds } = d;
                        const [[bx0, by0], [bx1, by1]] = bounds;
                        const type = feature.properties?.highway;

                        // LOD Check
                        const isMotorway = type === 'motorway';
                        const isTrunk = type === 'trunk';
                        const isPrimary = type === 'primary';
                        const isSecondary = type === 'secondary';

                        let isVisible = false;
                        if (k < 1.2) isVisible = isMotorway;
                        else if (k < 1.8) isVisible = isMotorway || isTrunk;
                        else if (k < 2.5) isVisible = isMotorway || isTrunk || isPrimary;
                        else isVisible = true;

                        if (isVisible) {
                            // Exact Bounds Check
                            if (
                                bx1 >= vp.x0 - buffer &&
                                bx0 <= vp.x1 + buffer &&
                                by1 >= vp.y0 - buffer &&
                                by0 <= vp.y1 + buffer
                            ) {
                                ctx.beginPath();
                                canvasPath(feature as any);

                                // Style (Improved Quality)
                                if (isMotorway) {
                                    ctx.lineWidth = 2.5 / k; // Scale invariant width? Or thicker?
                                    // User said quality is bad. Maybe too thin?
                                    // Let's try constant screen width for now, or slight scaling.
                                    // Previous was constant 1.5. 
                                    // If we divide by k, it stays same world size (gets smaller on screen).
                                    // We want screen size to be consistent?
                                    ctx.lineWidth = 1.5; // Constant screen width
                                    ctx.strokeStyle = 'rgba(234, 179, 8, 0.9)'; // Brighter
                                } else if (isTrunk) {
                                    ctx.lineWidth = 1.2;
                                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                                } else {
                                    ctx.lineWidth = 0.8;
                                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                                }
                                ctx.stroke();
                            }
                        }
                        d = d.next;
                    }
                }
                return false;
            });

            ctx.restore();
        }
    }), [width, height, tree, projection]);

    // 3. Initial Setup & Prop Updates
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        // Trigger initial draw
        // We can't call 'draw' directly from ref here easily without exposing it internally too?
        // Actually we can just call the logic or use the ref if we attached it to a RefObject passed in?
        // But we are using forwardRef.
        // Let's just expose a ref-independent draw function? 
        // Or simply: the parent calls draw() on mount/update? 
        // No, parent might not know when data is ready.
        // So we should draw here too.

        // Copied logic or shared function?
        // Let's rely on the parent (Map) calling draw() via the ref in its useEffect?
        // Or just duplicate the draw call here for safety?
        // I'll extract `drawRoads` function inside.

    }, [width, height]); // Resize handling

    // Draw on prop update (React verify)
    useEffect(() => {
        // This effect handles the "React" cycle updates (e.g. data loaded, or transform changed via props - though we want to ignore prop transform for zoom)
        // Actually, if we use imperative handle, we should probably ignore `transform` prop for drawing, 
        // to avoid double-drawing or conflict? 
        // But `transform` prop is still useful for initial state.

        // To avoid code duplication, I will implement a shared draw function.
    }, [transform, tree]);

    // Internal Draw Helper
    const draw = (currentTransform: { x: number, y: number, k: number }) => {
        const canvas = canvasRef.current;
        if (!canvas || !tree) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y, k } = currentTransform;
        const pixelRatio = window.devicePixelRatio || 1;

        ctx.save();
        ctx.scale(pixelRatio, pixelRatio);
        ctx.clearRect(0, 0, width, height);
        ctx.translate(x, y);
        ctx.scale(k, k);

        // Disabled Clipping for smooth panning (avoid "jumping" at edges)
        // Disabled Clipping for smooth panning (avoid "jumping" at edges)
        const localProjection = (projection as any).copy ? (projection as any).copy().clipExtent(null) : projection;
        const canvasPath = geoPath(localProjection).context(ctx);
        const invertX = (px: number) => (px - x) / k;
        const invertY = (py: number) => (py - y) / k;
        const vp = { x0: invertX(0), y0: invertY(0), x1: invertX(width), y1: invertY(height) };
        const buffer = 50 / k;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        tree.visit((node, x1, y1, x2, y2) => {
            if (x1 > vp.x1 + buffer || x2 < vp.x0 - buffer || y1 > vp.y1 + buffer || y2 < vp.y0 - buffer) return true;
            if (!node.length) {
                let d = (node as any).data;
                while (d) {
                    const { feature, bounds } = d;
                    const [[bx0, by0], [bx1, by1]] = bounds;
                    const isMotorway = feature.properties?.highway === 'motorway';
                    const isTrunk = feature.properties?.highway === 'trunk';

                    let isVisible = false;
                    if (k < 1.2) isVisible = isMotorway;
                    else if (k < 2.5) isVisible = isMotorway || isTrunk;
                    else isVisible = true;

                    if (isVisible) {
                        if (bx1 >= vp.x0 - buffer && bx0 <= vp.x1 + buffer && by1 >= vp.y0 - buffer && by0 <= vp.y1 + buffer) {
                            ctx.beginPath();
                            canvasPath(feature as any);
                            if (isMotorway) {
                                ctx.lineWidth = 2;
                                ctx.strokeStyle = 'rgba(255, 157, 0, 0.1)'; // 고속도로 (Expressway) - Blue/Teal (Naver Style)
                            } else if (isTrunk) {
                                ctx.lineWidth = 1.5;
                                ctx.strokeStyle = 'rgba(255, 204, 0, 0.1)'; // 국도/간선도로 (National Route) - Yellow
                            } else if (feature.properties?.highway === 'primary') {
                                ctx.lineWidth = 1.0;
                                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // 주요 도로 (Primary) - White
                            } else if (feature.properties?.highway === 'secondary') {
                                ctx.lineWidth = 0.8;
                                ctx.strokeStyle = 'rgba(200, 200, 200, 0.1)'; // 보조 도로 (Secondary) - Light Grey
                            } else {
                                ctx.lineWidth = 0.5;
                                ctx.strokeStyle = 'rgba(150, 150, 150, 0.1)'; // 기타 도로 (Others) - Faint Grey
                            }
                            ctx.stroke();
                        }
                    }
                    d = d.next;
                }
            }
            return false;
        });
        ctx.restore();
    };

    useImperativeHandle(ref, () => ({ draw }), [width, height, tree, projection]);

    // React Cycle Draw
    useEffect(() => {
        draw(transform);
    }, [transform, width, height, tree]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 10, opacity: 0.7 }}
        />
    );
}));
