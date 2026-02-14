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
    const contextStrokeWidth = 0.5 / transform.k;
    const contextStrokeColor = theme === 'tactical' ? '#333333' : '#94a3b8';

    return (
        <>
            {/* Context Layer: Silhouette of full Level 2 Map */}
            {level2Data?.features.map((feature: any) => (
                <path
                    key={`context-${feature.properties.code}`}
                    d={pathGenerator(feature) || ''}
                    fill="none"
                    stroke={contextStrokeColor}
                    strokeWidth={contextStrokeWidth}
                    style={{ pointerEvents: 'none' }}
                />
            ))}

            {/* Active Game Layer */}
            {features.map((feature: any, index: number) => {
                const code = feature.properties.code;
                const isAnswered = answeredRegions.has(code);
                const isCorrectFeedback = lastFeedback?.regionCode === code && lastFeedback?.isCorrect;
                // Wrong feedback is handled by HighlightOverlay to avoid re-rendering base layer on wrong answer

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
                            // Base layer doesn't handle events directly for better performance separation,
                            // but we keep visual properties here. events are handled by a transparent layer on top.
                            // Wait, previous plan was to use Interaction Layer.
                            // However, typically SVG structure requires the element to be present to receive events.
                            // If we use a separate transparent layer on top, we duplicate DOM nodes.
                            // For now, let's keep pointer-events here but NOT passing event handlers.
                            // Actually, if we don't pass onClick here, how do we click?
                            // Optimization Strategy:
                            // 1. Base Layer renders visual state.
                            // 2. Interaction Layer renders transparent copies with event handlers.
                            // But doubling DOM nodes (2x paths) is also a cost.

                            // Revised Strategy for Base Layer:
                            // Render visual state. DO NOT re-render on hover.
                            // Re-render only on answeRed/Theme change.
                            // We need to decide where to put event handlers.
                            // If we put handlers here, we don't need to pass hoveredRegion, so it won't re-render on hover.
                            // But we need to pass setHoveredRegion callback. That's fine.
                            // The key is: this component props should NOT change on hover.
                        }}
                    />
                );
            })}
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
