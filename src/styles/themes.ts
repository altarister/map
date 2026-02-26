/**
 * 중앙화된 맵 테마 색상 정의.
 * Map.tsx, BaseMapLayerCanvas, RoadLayer, 
 * 모든 렌더링 레이어가 이 파일을 단일 소스로 참조합니다.
 */

// ── Base Map & Overlay Colors ────────────────────────────────────────────────

export const MAP_THEME_COLORS = {
    tactical: {
        fill: '#1a1a1a',
        stroke: '#444444',
        answeredFill: 'rgba(22, 163, 74, 0.4)',
        answeredStroke: '#444444',
        correctFill: 'rgba(22, 163, 74, 0.6)',
        correctStroke: '#444444',
        wrongFill: 'rgba(220, 38, 38, 0.6)',
        wrongStroke: '#444444',
        hoverFill: 'rgba(255, 255, 255, 0.1)',
        hoverStroke: '#ffffff',
        hoverDefaultFill: '#333333',
    },
    kids: {
        fill: '#ffffff',
        stroke: '#94a3b8',
        answeredFill: 'rgba(59, 130, 246, 0.4)',
        answeredStroke: '#94a3b8',
        correctFill: 'rgba(59, 130, 246, 0.6)',
        correctStroke: '#94a3b8',
        wrongFill: 'rgba(239, 68, 68, 0.6)',
        wrongStroke: '#94a3b8',
        hoverFill: 'rgba(250, 204, 21, 0.4)',
        hoverStroke: '#f59e0b',
        hoverDefaultFill: '#fef3c7',
    },
} as const;

export type MapTheme = keyof typeof MAP_THEME_COLORS;
export type MapThemeColors = typeof MAP_THEME_COLORS[MapTheme];

// ── Road Colors ──────────────────────────────────────────────────────────────

export const ROAD_THEME_COLORS = {
    tactical: {
        motorway:  { color: '#f6893b', width: 0.3, minK: 0 },
        trunk:     { color: '#f5991a', width: 0.3, minK: 1.2 },
        primary:   { color: '#d5cd5d', width: 0.2, minK: 1.8 },
        secondary: { color: '#9ca3af', width: 0.2, minK: 2.5 },
        other:     { color: '#f5991a', width: 0.2, minK: 2.5 },
    },
    kids: {
        motorway:  { color: '#fbbf24', width: 0.3, minK: 0 },
        trunk:     { color: '#fcd34d', width: 0.3, minK: 1.0 },
        primary:   { color: '#fcd34d', width: 0.2, minK: 1.5 },
        secondary: { color: '#cbd5e1', width: 0.2, minK: 2.0 },
        other:     { color: '#fbbf24', width: 0.2, minK: 2.0 },
    },
} as const;
