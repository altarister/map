import { memo } from 'react';
import type { GeoPath, GeoPermissibleObjects } from 'd3-geo';
import type { Feature } from 'geojson'; // Fix: type-only import

interface RoadLayerProps {
    features: Feature[];
    pathGenerator: GeoPath<any, GeoPermissibleObjects>;
}

export const RoadLayer = memo(({ features, pathGenerator }: RoadLayerProps) => {
    if (!features || features.length === 0) return null;

    return (
        <g className="road-layer pointer-events-none">
            {features.map((feature, index) => {
                const type = feature.properties?.highway;
                // Optimization: Skip rendering if path is empty/invalid
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
}, (prev, next) => {
    return (
        prev.features === next.features &&
        prev.pathGenerator === next.pathGenerator
    );
});
