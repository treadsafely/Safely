import type { RefObject } from 'react';
import { useCallback, useEffect, useState } from 'react';

import { findScrollRoot, useIsVisible } from '../../shared';

export type NewTransactionsBubbleMode = 'hidden' | 'one' | 'many';

export type UseNewTransactionsBubbleReturn = {
    topRef: RefObject<HTMLDivElement | null>;
    mode: NewTransactionsBubbleMode;
    show: () => void;
    scrollToTop: () => void;
};

const TOP_THRESHOLD = '44px 0px 0px 0px';

export function useNewTransactionsBubble(): UseNewTransactionsBubbleReturn {
    const { ref: topRef, isVisible: isAtTop } = useIsVisible({ rootMargin: TOP_THRESHOLD });
    const [mode, setMode] = useState<NewTransactionsBubbleMode>('hidden');

    useEffect(() => {
        if (isAtTop) {
            setMode('hidden');
        }
    }, [isAtTop]);

    const show = useCallback(() => {
        if (isAtTop) {
            return;
        }

        setMode(current => (current === 'hidden' ? 'one' : 'many'));
    }, [isAtTop]);

    const scrollToTop = useCallback(() => {
        setMode('hidden');

        const node = topRef.current;

        if (node !== null) {
            findScrollRoot(node)?.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [topRef]);

    return { topRef, mode, show, scrollToTop };
}
