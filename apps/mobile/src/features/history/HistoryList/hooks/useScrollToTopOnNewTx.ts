import { type RefObject, useEffect, useRef } from 'react';

import type { ListRef } from '@mobile/shared/ui/Screen/components/List';

export function useScrollToTopOnNewTx<TItem>(
    listRef: RefObject<ListRef<TItem> | null>,
    txId: string | undefined
): void {
    const prevTxIdRef = useRef(txId);

    useEffect(() => {
        async function scrollAndRecordInteraction() {
            await listRef.current?.scrollToIndex({
                index: 0,
                animated: true,
                viewPosition: 0
            });
            listRef.current?.recordInteraction();
        }
        if (txId && txId !== prevTxIdRef.current) {
            void scrollAndRecordInteraction();
        }
        prevTxIdRef.current = txId;
    }, [txId, listRef]);
}
