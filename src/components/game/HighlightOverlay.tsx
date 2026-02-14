import { memo } from 'react';
import type { GeoPath } from 'd3-geo';
import type { RegionFeature } from '../../types/geo';
import type { AnswerFeedback } from '../../types/game';

interface HighlightOverlayProps {
    features: RegionFeature[];
    pathGenerator: GeoPath;
    hoveredRegion: string | null;
    themeColors: any;
    transform: { k: number };
    lastFeedback: AnswerFeedback | null;
}

export const HighlightOverlay = memo(({
    features,
    pathGenerator,
    hoveredRegion,
    themeColors,
    transform,
    lastFeedback
}: HighlightOverlayProps) => {
    const strokeWidth = 1 / transform.k;

    // 1. Hover Highlight
    const hoverFeature = hoveredRegion
        ? features.find(f => f.properties.code === hoveredRegion)
        : null;

    // 2. Wrong Feedback Highlight (Transient red flash)
    const wrongFeedbackFeature = (lastFeedback && !lastFeedback.isCorrect)
        ? features.find(f => f.properties.code === lastFeedback.regionCode)
        : null;

    if (!hoverFeature && !wrongFeedbackFeature) return null;

    return (
        <g style={{ pointerEvents: 'none' }}>
            {/* Wrong Feedback (Red Fill) */}
            {wrongFeedbackFeature && (
                <path
                    d={pathGenerator(wrongFeedbackFeature as any) || ''}
                    fill={themeColors.wrongFill}
                    stroke={themeColors.wrongStroke}
                    strokeWidth={strokeWidth}
                />
            )}

            {/* Hover Highlight (Stroke only) */}
            {hoverFeature && (
                <path
                    d={pathGenerator(hoverFeature as any) || ''}
                    fill="none" // Hover is stroke only in new design
                    stroke={themeColors.hoverStroke}
                    strokeWidth={strokeWidth * 1.5} // Slightly thicker for emphasis
                />
            )}
        </g>
    );
});
