import { useState, useCallback, useLayoutEffect, useRef } from 'react';

interface Dimensions {
    width: number;
    height: number;
}

export const useMapDimensions = <T extends HTMLElement>() => {
    const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });
    const [node, setNode] = useState<T | null>(null);
    const observerRef = useRef<ResizeObserver | null>(null);

    const ref = useCallback((node: T | null) => {
        setNode(node);
    }, []);

    useLayoutEffect(() => {
        if (!node) return;

        // Measure immediately
        const measure = () => {
            const { clientWidth, clientHeight } = node;
            setDimensions({ width: clientWidth, height: clientHeight });
        };
        measure();

        observerRef.current = new ResizeObserver((entries) => {
            if (!entries[0]) return;
            const { width, height } = entries[0].contentRect;
            requestAnimationFrame(() => {
                setDimensions({ width, height });
            });
        });

        observerRef.current.observe(node);

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [node]);

    return { ref, ...dimensions };
};
