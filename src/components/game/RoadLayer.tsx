import { memo, useEffect, useRef, useMemo } from 'react';
import { geoPath } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import { quadtree } from 'd3-quadtree';
import type { Feature } from 'geojson';

interface RoadLayerProps {
    features: Feature[];
    projection: GeoProjection; // Needed for local path generation
    transform: { x: number, y: number, k: number };
    width: number;
    height: number;
}

export const RoadLayer = memo(({ features, projection, transform, width, height }: RoadLayerProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // 1. Spatial Indexing: Build Quadtree
    // Use a temporary path generator for bounds calculation during indexing
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

    // 2. Rendering Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !tree) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // High DPI Support
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        ctx.scale(pixelRatio, pixelRatio);
        ctx.clearRect(0, 0, width, height);

        // Apply Transform
        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.k, transform.k);

        // Path Generator for this context
        const canvasPath = geoPath(projection).context(ctx);

        // Viewport Culling
        const invertX = (x: number) => (x - transform.x) / transform.k;
        const invertY = (y: number) => (y - transform.y) / transform.k;

        const vp = {
            x0: invertX(0),
            y0: invertY(0),
            x1: invertX(width),
            y1: invertY(height)
        };

        const buffer = 50 / transform.k;
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

                    let isVisible = false;
                    if (transform.k < 1.2) isVisible = isMotorway;
                    else if (transform.k < 2.5) isVisible = isMotorway || isTrunk;
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

                            // Style
                            if (isMotorway) {
                                ctx.lineWidth = 1.5;
                                ctx.strokeStyle = 'rgba(234, 179, 8, 0.8)'; // Yellow-500
                            } else if (isTrunk) {
                                ctx.lineWidth = 1.0;
                                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                            } else {
                                ctx.lineWidth = 0.5;
                                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
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
    }, [width, height, transform, tree, projection]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 10 }} // Layer 2: Middle
        />
    );
});
