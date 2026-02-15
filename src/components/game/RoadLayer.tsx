import { memo, useMemo } from 'react';
import type { GeoPath, GeoPermissibleObjects } from 'd3-geo';
import { quadtree } from 'd3-quadtree';
import type { Feature } from 'geojson'; // Fix: type-only import

interface RoadLayerProps {
    features: Feature[];
    pathGenerator: GeoPath<any, GeoPermissibleObjects>;
    zoom: number; // For LOD
    viewport?: { x: number, y: number, width: number, height: number }; // For Culling
}

export const RoadLayer = memo(({ features, pathGenerator, zoom, viewport }: RoadLayerProps) => {
    // 1. Spatial Indexing: Build Quadtree (Memoized)
    // This runs once when features/projection load.
    const tree = useMemo(() => {
        const q = quadtree<any>()
            .x(d => d.centroid[0])
            .y(d => d.centroid[1]);

        // Calculate centroids and add to quadtree
        const data = features.map(f => {
            // We need a stable point for Quadtree. Centroid is good.
            // pathGenerator.centroid usually returns [x, y].
            const centroid = pathGenerator.centroid(f as any);
            return {
                feature: f,
                centroid: centroid,
                bounds: pathGenerator.bounds(f as any) // Keep bounds for precise checking
            };
        });

        q.addAll(data);
        return q;
    }, [features, pathGenerator]);

    // 2. Filter features based on Viewport and LOD using Quadtree
    const visibleFeatures = useMemo(() => {
        // If no viewport provided, return all (fallback)
        if (!viewport) return features.map(f => ({ feature: f }));

        const { x, y, width, height } = viewport;
        const x0 = x, y0 = y, x3 = x + width, y3 = y + height;

        // Quadtree Search (O(logN))
        const found: { feature: Feature }[] = [];

        // Use strict visiting for precise culling
        tree.visit((node, x1, y1, x2, y2) => {
            // If current node's bounding box is outside viewport, skip children (return true)
            if (x1 > x3 || x2 < x0 || y1 > y3 || y2 < y0) return true;

            // If leaf node, check points
            if (!node.length) {
                // Iterate over leaf data (d3-quadtree can store multiple points in a linked list structure in 'data' prop)
                let d = (node as any).data;
                while (d) {
                    const { feature, bounds } = d;
                    const [[bx0, by0], [bx1, by1]] = bounds;
                    const type = feature.properties?.highway;

                    // LOD Check first (Cheapest)
                    const isVisibleLOD = (zoom >= 1.2) || (type === 'motorway');

                    if (isVisibleLOD) {
                        // Precise Bounds Intersection Check
                        const BUFFER = 50; // Standard buffer is enough with fast lookups
                        if (
                            bx1 >= x0 - BUFFER &&
                            bx0 <= x3 + BUFFER &&
                            by1 >= y0 - BUFFER &&
                            by0 <= y3 + BUFFER
                        ) {
                            found.push({ feature });
                        }
                    }
                    d = d.next;
                }
            }
            return false;
        });

        return found;
    }, [tree, viewport, zoom, features]);

    if (!features || features.length === 0) return null;

    return (
        <g className="road-layer pointer-events-none">
            {visibleFeatures.map(({ feature }, index) => {
                const type = feature.properties?.highway;
                const d = pathGenerator(feature as any);
                if (!d) return null;

                return (
                    <path
                        key={`road-${feature.properties?.id || index}`}
                        d={d}
                        className={`fill-none stroke-linecap-round stroke-linejoin-round transition-colors duration-300
              ${type === 'motorway' ? 'stroke-road-motorway' : 'stroke-road-trunk'}
              ${type === 'motorway' ? 'stroke-[1.5px]' : 'stroke-[0.8px]'}
              opacity-60
            `}
                    />
                );
            })}
        </g>
    );
});
