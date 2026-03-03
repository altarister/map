/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo } from 'react';
import type { GeoPath } from 'd3-geo';
import type { RegionFeature } from '../../types/geo';

interface InteractionLayerProps {
    features: RegionFeature[];
    pathGenerator: GeoPath;
    onRegionClick: (code: string) => void;
    onRegionHover: (code: string | null) => void;
    gameState: string;
    showTownGeometry: boolean;
    answeredRegions: Set<string>;
    onRegionContextMenu?: (event: React.MouseEvent, feature: RegionFeature) => void;
}

export const InteractionLayer = memo(({
    features,
    pathGenerator,
    onRegionClick,
    onRegionHover,
    gameState,
    showTownGeometry,
    answeredRegions,
    onRegionContextMenu
}: InteractionLayerProps) => {
    return (
        <>
            {features.map((feature: any, index: number) => {
                const code = feature.properties.code;
                const isAnswered = answeredRegions.has(code);

                return (
                    <path
                        key={`interaction-${code || index}`}
                        d={pathGenerator(feature as any) || ''}
                        fill="transparent"
                        stroke="none"
                        style={{
                            cursor: (gameState === 'PLAYING' || gameState === 'REGION_SELECT' || gameState === 'SUBREGION_SELECT') && !isAnswered ?
                                (showTownGeometry || gameState === 'REGION_SELECT' || gameState === 'SUBREGION_SELECT' ? 'pointer' : 'not-allowed') : 'default',
                            pointerEvents: 'all' // This layer captures all events
                        }}
                        onContextMenu={(e) => {
                            if (onRegionContextMenu) {
                                onRegionContextMenu(e, feature);
                            }
                        }}
                        onMouseEnter={() => {
                            if (!isAnswered) onRegionHover(code);
                        }}
                        onMouseLeave={() => onRegionHover(null)}
                        onClick={() => {
                            // Prevent clicking on already answered regions
                            if (!isAnswered) {
                                onRegionClick(code);
                            }
                        }}
                    />
                );
            })}
        </>
    );
}, (prev, next) => {
    // Interaction layer rarely changes. features and gameState are main dependencies.
    // [단일 폴리곤 정답 오답 버그 수정]: 최신 currentQuestion 클로저 반영을 위해 클릭 핸들러 변경시 리렌더링 허용
    return (
        prev.features === next.features &&
        prev.gameState === next.gameState &&
        prev.showTownGeometry === next.showTownGeometry &&
        prev.pathGenerator === next.pathGenerator && // Critical for resize handling
        prev.answeredRegions === next.answeredRegions && // Need to re-render when answered regions change to update cursor/click
        prev.onRegionClick === next.onRegionClick &&
        prev.onRegionHover === next.onRegionHover
    );
});
