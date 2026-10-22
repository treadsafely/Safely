import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';

import { findScrollRoot } from '../dom';

export type UseIsVisibleOptions = {
    rootMargin?: string;
};

export type UseIsVisibleReturn = {
    ref: RefObject<HTMLDivElement | null>;
    isVisible: boolean;
};

export function useIsVisible(options: UseIsVisibleOptions = {}): UseIsVisibleReturn {
    const { rootMargin = '0px' } = options;

    const ref = useRef<HTMLDivElement | null>(null);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const node = ref.current;

        if (!node) {
            return;
        }

        const observer = new IntersectionObserver(
            entries => setIsVisible(entries.some(entry => entry.isIntersecting)),
            { root: findScrollRoot(node), rootMargin }
        );

        observer.observe(node);

        return () => observer.disconnect();
    }, [rootMargin]);

    return { ref, isVisible };
}
