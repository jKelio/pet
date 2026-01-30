import { useRef, useState, useEffect, RefObject } from 'react';

export function useContainerWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
    const containerRef = useRef<T>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setWidth(entry.contentRect.width);
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    return [containerRef, width];
}
