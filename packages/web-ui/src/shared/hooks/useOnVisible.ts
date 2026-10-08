import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';

export type UseOnVisibleOptions = {
    isEnabled?: boolean;
    rootMargin?: string;
};

// an ancestor scroller clips the target, so rootMargin only reaches ahead when that scroller is the root
function findScrollRoot(node: HTMLElement): HTMLElement | null {
    for (let parent = node.parentElement; parent !== null; parent = parent.parentElement) {
        const { overflowY } = getComputedStyle(parent);

        if (overflowY === 'auto' || overflowY === 'scroll') {
            return parent;
        }
    }

    return null;
}

export function useOnVisible(
    onVisible: () => void,
    options: UseOnVisibleOptions = {}
): RefObject<HTMLDivElement | null> {
    const { isEnabled = true, rootMargin = '0px' } = options;

    const ref = useRef<HTMLDivElement | null>(null);
    const callbackRef = useRef(onVisible);

    useEffect(() => {
        callbackRef.current = onVisible;
    }, [onVisible]);

    useEffect(() => {
        const node = ref.current;

        if (!node || !isEnabled) {
            return;
        }

        const observer = new IntersectionObserver(
            entries => {
                if (entries.some(entry => entry.isIntersecting)) {
                    callbackRef.current();
                }
            },
            { root: findScrollRoot(node), rootMargin }
        );

        observer.observe(node);

        return () => observer.disconnect();
    }, [isEnabled, rootMargin]);

    return ref;
}
