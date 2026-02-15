import { memo } from 'react';
import type { GeoPath } from 'd3-geo';
import type { RegionFeature } from '../../types/geo';
import type { AnswerFeedback } from '../../types/game';

interface BaseMapLayerProps {
    features: RegionFeature[];
    level2Data: { features: RegionFeature[] } | null;
    pathGenerator: GeoPath;
    theme: string;
    themeColors: any;
    transform: { k: number };
    answeredRegions: Set<string>;
    lastFeedback: AnswerFeedback | null;
}

export const BaseMapLayer = memo(({
    features,
    level2Data,
    pathGenerator,
    theme,
    themeColors,
    transform,
    answeredRegions,
    lastFeedback
}: BaseMapLayerProps) => {

    const strokeWidth = 1 / transform.k;


    return (
        <>
            {/* Active Game Layer */}
            {features.map((feature: any, index: number) => {
                const code = feature.properties.code;
                const isAnswered = answeredRegions.has(code);
                const isCorrectFeedback = lastFeedback?.regionCode === code && lastFeedback?.isCorrect;

                let fillColor = themeColors.fill;
                let strokeColor = themeColors.stroke;

                if (isAnswered) {
                    fillColor = themeColors.answeredFill;
                    strokeColor = themeColors.answeredStroke;
                }
                if (isCorrectFeedback) {
                    fillColor = themeColors.correctFill;
                    strokeColor = themeColors.correctStroke;
                }

                return (
                    <path
                        key={code || index}
                        d={pathGenerator(feature as any) || ''}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        style={{
                            transition: 'fill 0.15s, stroke 0.15s',
                        }}
                    />
                );
            })}

            {/* Context Layer: Level 2 Borders (Rendered ON TOP for visibility) */}
            {level2Data?.features.map((feature: any) => (
                <path
                    key={`context-${feature.properties.code}`}
                    d={pathGenerator(feature) || ''}
                    fill="none"
                    // Tactical: Lighter gray for visibility on top of dark map
                    stroke={theme === 'tactical' ? 'rgba(255,255,255,0.3)' : '#64748b'}
                    strokeWidth={theme === 'tactical' ? 2.0 / transform.k : 1.5 / transform.k}
                    style={{ pointerEvents: 'none' }}
                />
            ))}
        </>
    );
}, (prev, next) => {
    // Custom comparison to ensure strict memoization
    return (
        prev.theme === next.theme &&
        prev.transform.k === next.transform.k &&
        prev.features === next.features &&
        prev.level2Data === next.level2Data &&
        prev.answeredRegions === next.answeredRegions &&
        prev.pathGenerator === next.pathGenerator && // Critical for resize handling
        // Only re-render base layer if feedback is CORRECT (permanent change)
        // WRONG feedback is transient and handled by Overlay
        (prev.lastFeedback === next.lastFeedback || next.lastFeedback?.isCorrect === false)
    );
});
