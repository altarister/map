import { useState, useEffect, useRef } from 'react';

interface Dimensions {
    width: number;
    height: number;
}

export const useMapDimensions = <T extends HTMLElement>() => {
    const ref = useRef<T>(null);
    const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });

    useEffect(() => {
        if (!ref.current) return;

        const observer = new ResizeObserver((entries) => {
            if (!entries[0]) return;

            const { width, height } = entries[0].contentRect;

            // Use requestAnimationFrame to debounce and sync with render cycle
            requestAnimationFrame(() => {
                setDimensions({ width, height });
            });
        });

        observer.observe(ref.current);

        return () => {
            observer.disconnect();
        };
    }, []);

    return { ref, ...dimensions };
};
