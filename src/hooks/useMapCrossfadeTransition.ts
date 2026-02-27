import { useCallback, useRef, type RefObject } from 'react';

interface UseMapCrossfadeTransitionProps {
  canvasWrapperRef: RefObject<HTMLDivElement | null>;
  containerNodeRef: RefObject<HTMLDivElement | null>;
}

export const useMapCrossfadeTransition = ({
  canvasWrapperRef,
  containerNodeRef,
}: UseMapCrossfadeTransitionProps) => {
  // 타이머 ID 저장 → handleZoomStart 시 잔여 타이머 즉시 취소
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingTimers = useCallback(() => {
    if (fadeTimerRef.current !== null) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    if (cleanupTimerRef.current !== null) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
  }, []);

  const handleZoomStart = useCallback(() => {
    // 잔여 타이머 취소 (새 인터랙션 시작 시 이전 페이드 중단)
    clearPendingTimers();

    // 떠 있던 스냅샷 클론 일괄 삭제
    document.querySelectorAll('#zoom-crossfade-snapshot').forEach(el => el.remove());

    // 진행 중이던 페이드인 효과 즉시 중단 및 불투명 100% 복구 (반투명 줌 방지)
    if (canvasWrapperRef.current) {
      canvasWrapperRef.current.style.transition = 'none';
      canvasWrapperRef.current.style.opacity = '1';
    }
  }, [canvasWrapperRef, clearPendingTimers]);

  const handleCrossfadeStart = useCallback(() => {
    // 줌 완료 직전 DOM 스냅샷 찍어 디졸브 오버레이 생성
    const node = containerNodeRef.current;
    if (!canvasWrapperRef.current || !node) return;

    // 잔여 타이머 먼저 취소 (연속 줌 방어)
    clearPendingTimers();

    // --- 1. 스냅샷 생성 ---
    const realWrapper = canvasWrapperRef.current;

    // 연속 실행 방지: 남아있는 이전 스냅샷 제거 (화면 하얘짐 방지)
    document.querySelectorAll('#zoom-crossfade-snapshot').forEach(el => el.remove());

    const clone = realWrapper.cloneNode(true) as HTMLDivElement;
    clone.id = 'zoom-crossfade-snapshot';
    clone.style.position = 'absolute';
    clone.style.inset = '0';
    clone.style.pointerEvents = 'none';
    clone.style.transition = 'none'; // 스냅샷은 배경판 역할이므로 트랜지션 없음
    clone.style.opacity = '1';       // 100% 불투명한 배경판 역할
    clone.style.zIndex = '0';        // UI(SVG) 레이어보다 낮게

    // 캔버스 픽셀 복사
    const originalCanvases = realWrapper.querySelectorAll('canvas');
    const clonedCanvases = clone.querySelectorAll('canvas');
    originalCanvases.forEach((origNode, index) => {
      const orig = origNode as HTMLCanvasElement;
      const dest = clonedCanvases[index] as HTMLCanvasElement;
      if (orig && dest) {
        dest.getContext('2d')?.drawImage(orig, 0, 0);
      }
    });

    // 진짜 캔버스의 바로 앞(밑장)에 삽입
    if (realWrapper.parentNode) {
      realWrapper.parentNode.insertBefore(clone, realWrapper);
    } else {
      node.appendChild(clone);
    }

    // --- 2. 진짜 캔버스(새 지도) 투명화 ---
    realWrapper.style.transition = 'none';
    realWrapper.style.opacity = '0';

    // --- 3. 50ms 후 페이드인 시작 ---
    fadeTimerRef.current = setTimeout(() => {
      fadeTimerRef.current = null;
      if (!realWrapper.isConnected) return; // 언마운트 방어
      realWrapper.style.transition = 'opacity 400ms ease-out';
      realWrapper.style.opacity = '1';
      clone.style.transition = 'opacity 800ms ease-out';
      clone.style.opacity = '0';
    }, 50);

    // --- 4. 4100ms 후 스냅샷 DOM 정리 ---
    cleanupTimerRef.current = setTimeout(() => {
      cleanupTimerRef.current = null;
      if (clone.parentNode) clone.parentNode.removeChild(clone);
      if (realWrapper.isConnected) realWrapper.style.transition = '';
    }, 4100);

  }, [canvasWrapperRef, containerNodeRef, clearPendingTimers]);

  return {
    handleZoomStart,
    handleCrossfadeStart,
  };
};
