import { type RefObject, useEffect, useRef } from 'react';

import type { ListRef } from '@mobile/shared/ui/Screen/components/List';

export function useScrollToTopOnNewTx<TItem>(
    listRef: RefObject<ListRef<TItem> | null>,
    txId: string | undefined
): void {
    const prevTxIdRef = useRef(txId);

    useEffect(() => {
        if (txId && txId !== prevTxIdRef.current) {
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
            listRef.current?.recordInteraction();
        }
        prevTxIdRef.current = txId;
    }, [txId, listRef]);
}
