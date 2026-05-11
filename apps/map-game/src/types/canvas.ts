/**
 * 공통 Canvas Layer 인터페이스.
 * RoadLayerHandle, BaseMapLayerHandle 등 모든 Canvas 기반 레이어가 이를 구현해야 합니다.
 * useMapZoom이 레이어별 구현체를 직접 알지 않고 이 인터페이스만으로 제어할 수 있습니다.
 */
export interface CanvasLayerHandle {
    /** 줌 종료 시 호출. Canvas를 완전히 다시 그립니다. */
    draw: (transform: { x: number; y: number; k: number }) => void;
    /** 줌 도중 호출 (60fps). CSS transform만 변경해 부드럽게 움직입니다. */
    setCssTransform: (
        current: { x: number; y: number; k: number },
        start: { x: number; y: number; k: number }
    ) => void;
}
