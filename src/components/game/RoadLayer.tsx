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
    theme: string;
    // Visibility Props
    visibleMotorway: boolean;
    visibleTrunk: boolean;
    visiblePrimary: boolean;
    visibleSecondary: boolean;
    visibleOther: boolean;
}

export interface RoadLayerHandle {
    draw: (transform: { x: number, y: number, k: number }) => void;
    findRoads: (region: Feature) => string[];
}

const ROAD_THEME = {
    tactical: {
        motorway: { color: '#f6893b', width: 1.8, minK: 0 },
        trunk: { color: '#fbbf24', width: 1.5, minK: 1.2 },
        primary: { color: '#ffffff', width: 1.2, minK: 1.8 },
        secondary: { color: '#9ca3af', width: 0.9, minK: 2.5 },
        other: { color: '#4b5563', width: 0.6, minK: 2.5 }
    },
    kids: {
        motorway: { color: '#fbbf24', width: 3.0, minK: 0 }, // Amber-400
        trunk: { color: '#fcd34d', width: 2.5, minK: 1.0 }, // Amber-300
        primary: { color: '#ffffff', width: 2.0, minK: 1.5 },
        secondary: { color: '#cbd5e1', width: 1.5, minK: 2.0 }, // Slate-300
        other: { color: '#94a3b8', width: 1.0, minK: 2.0 } // Slate-400
    }
} as const;

export const RoadLayer = memo(forwardRef<RoadLayerHandle, RoadLayerProps>(({
    features, projection, transform, width, height, theme,
    visibleMotorway, visibleTrunk, visiblePrimary, visibleSecondary, visibleOther
}, ref) => {
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
        // Clear all canvases first
        contexts.forEach(ctx => {
            ctx.save();
            ctx.scale(pixelRatio, pixelRatio);
            ctx.clearRect(0, 0, width * CANVAS_SCALE, height * CANVAS_SCALE);

            // Setup Transform
            ctx.translate(offsetX, offsetY);
            ctx.translate(x, y);
            ctx.scale(k, k);

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        });

        // Projection logic needs to match
        const localProjection = (projection as any).copy ? (projection as any).copy().clipExtent(null) : projection;
        const canvasPath = geoPath(localProjection);

        // Inverse transform for culling
        const invertX = (px: number) => (px - x) / k;
        const invertY = (py: number) => (py - y) / k;

        // Visible viewport in World Coordinates
        const vp = {
            x0: invertX(-offsetX),
            y0: invertY(-offsetY),
            x1: invertX(width + offsetX),
            y1: invertY(height + offsetY)
        };

        const vpWidth = (width / k);
        const vpHeight = (height / k);
        const cullBuffer = Math.max(vpWidth, vpHeight) * 0.5;

        // Select Styles based on Theme
        const currentTheme = ROAD_THEME[theme as keyof typeof ROAD_THEME] || ROAD_THEME.tactical;

        tree.visit((node, x1, y1, x2, y2) => {
            if (x1 > vp.x1 + cullBuffer || x2 < vp.x0 - cullBuffer || y1 > vp.y1 + cullBuffer || y2 < vp.y0 - cullBuffer) return true;
            if (!node.length) {
                let d = (node as any).data;
                while (d) {
                    const { feature, bounds } = d;
                    const [[bx0, by0], [bx1, by1]] = bounds;
                    const type = feature.properties?.highway;

                    let targetCtx = null;
                    let style = null;

                    switch (type) {
                        case 'motorway': if (visibleMotorway) { targetCtx = ctxM; style = currentTheme.motorway; } break;
                        case 'trunk': if (visibleTrunk) { targetCtx = ctxT; style = currentTheme.trunk; } break;
                        case 'primary': if (visiblePrimary) { targetCtx = ctxP; style = currentTheme.primary; } break;
                        case 'secondary': if (visibleSecondary) { targetCtx = ctxS; style = currentTheme.secondary; } break;
                        default: if (visibleOther) { targetCtx = ctxO; style = currentTheme.other; } break;
                    }

                    if (targetCtx && style && k >= style.minK) {
                        if (bx1 >= vp.x0 - cullBuffer && bx0 <= vp.x1 + cullBuffer && by1 >= vp.y0 - cullBuffer && by0 <= vp.y1 + cullBuffer) {
                            targetCtx.beginPath();
                            canvasPath.context(targetCtx);
                            canvasPath(feature as any);
                            targetCtx.lineWidth = style.width;
                            targetCtx.strokeStyle = style.color;
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

    // Imperative Handle for Sync Updates (D3 Zoom) & Intel Query
    useImperativeHandle(ref, () => ({
        draw: (t) => {
            // Force synchronous draw
            drawCanvas(t.x, t.y, t.k);
        },
        findRoads: (region: Feature) => {
            if (!tree || !region) return [];

            const bounds = boundsGenerator.bounds(region as any);
            const [[x0, y0], [x1, y1]] = bounds;

            const roadNames = new Set<string>();

            // Basic AABB Query on Quadtree
            tree.visit((node, x1q, y1q, x2q, y2q) => {
                if (x1q > x1 || x2q < x0 || y1q > y1 || y2q < y0) return true; // Cull

                if (!node.length) {
                    let d = (node as any).data;
                    while (d) {
                        const { feature: roadFeature, bounds: roadBounds } = d;
                        const [[rx0, ry0], [rx1, ry1]] = roadBounds;

                        // Fine-grained AABB intersection check
                        if (rx1 >= x0 && rx0 <= x1 && ry1 >= y0 && ry0 <= y1) {
                            const props = roadFeature.properties || {};
                            const name = props.name;
                            const ref = props.ref;
                            const highway = props.highway; // e.g., "motorway", "primary"

                            if (name) {
                                roadNames.add(name);
                            } else if (ref) {
                                // Check if ref is numeric
                                roadNames.add(isNaN(Number(ref)) ? ref : `Route ${ref}`);
                            } else if (highway) {
                                // Capitalize highway type as fallback
                                const type = highway.charAt(0).toUpperCase() + highway.slice(1);
                                roadNames.add(type);
                            }
                        }
                        d = d.next;
                    }
                }
                return false;
            });

            return Array.from(roadNames).sort();
        }
    }), [width, height, tree, projection, theme, boundsGenerator, visibleMotorway, visibleTrunk, visiblePrimary, visibleSecondary, visibleOther]); // Added visibility deps

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
    }, [width, height, theme, visibleMotorway, visibleTrunk, visiblePrimary, visibleSecondary, visibleOther]); // Added visibility deps

    // NOTE: We do NOT use useEffect(draw) for 'transform' prop anymore.
    // However, we MUST draw if the road data (tree) loads for the first time while transformed.
    useLayoutEffect(() => {
        drawCanvas(transform.x, transform.y, transform.k);
    }, [tree, theme, visibleMotorway, visibleTrunk, visiblePrimary, visibleSecondary, visibleOther]); // Added visibility deps

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
                { ref: canvasOtherRef, z: 10, o: 0.2 },
                { ref: canvasSecondaryRef, z: 11, o: 0.2 },
                { ref: canvasPrimaryRef, z: 12, o: 0.2 },
                { ref: canvasTrunkRef, z: 13, o: 0.2 },
                { ref: canvasMotorwayRef, z: 14, o: 0.2 }
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
