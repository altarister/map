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
        fill: '#f8fafc',                         // slate-50 (순흰색보다 살짝 따뜻)
        stroke: '#7a91b3ff',                        // slate-600 (↑ 기존 #94a3b8 = slate-400 보다 훨씬 진함)
        answeredFill: 'rgba(59, 130, 246, 0.5)', // blue (↑ 0.4→0.5)
        answeredStroke: '#2563eb',               // blue-600 (↑ 기존 slate-400)
        correctFill: 'rgba(59, 130, 246, 0.65)',  // blue (↑ 0.6→0.65)
        correctStroke: '#1d4ed8',                // blue-700
        wrongFill: 'rgba(239, 68, 68, 0.65)',    // red (↑ 0.6→0.65)
        wrongStroke: '#b91c1c',                  // red-700
        hoverFill: 'rgba(250, 204, 21, 0.65)',   // amber (↑ 0.4→0.65, 흰 배경에 선명하게)
        hoverStroke: '#d97706',                  // amber-600 (↑ 기존 #f59e0b 보다 진함)
        hoverDefaultFill: '#fde68a',             // amber-200 (↑ 기존 #fef3c7 = amber-50 거의 흰색)
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
        motorway:  { color: '#f6893b', width: 0.3, minK: 0 },
        trunk:     { color: '#f5991a', width: 0.3, minK: 1.2 },
        primary:   { color: '#d5cd5d', width: 0.2, minK: 1.8 },
        secondary: { color: '#9ca3af', width: 0.2, minK: 2.5 },
        other:     { color: '#f5991a', width: 0.2, minK: 2.5 },
        // motorway:  { color: '#2563eb', width: 0.4, minK: 0 },    // blue-600: 고속도로 (굵고 진함)
        // trunk:     { color: '#3b82f6', width: 0.3, minK: 1.0 },  // blue-500: 국도
        // primary:   { color: '#60a5fa', width: 0.2, minK: 1.5 },  // blue-400: 주요도로
        // secondary: { color: '#93c5fd', width: 0.2, minK: 2.0 },  // blue-300: 보조도로
        // other:     { color: '#bfdbfe', width: 0.15, minK: 2.0 }, // blue-200: 기타
    },
} as const;
