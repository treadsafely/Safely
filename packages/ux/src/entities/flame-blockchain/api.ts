import type { FlameHistoryItem, FlameApi, FlameWallet } from '@safely/core';
import { flameHistoryContracts, toFlameHistoryItem, toFlameOutputBytes } from '@safely/core';

const ON_PAGE_ELEMENTS_LIMIT = 25;

export interface FlameHistoryPage {
    items: FlameHistoryItem[];
    older: string | null;
}

export async function fetchFlameActivity(
    api: FlameApi,
    wallet: Pick<FlameWallet, 'receivingAddress' | 'readAmounts'>,
    cursor: string | null
): Promise<FlameHistoryPage> {
    const page = await api.history([wallet.receivingAddress], {
        cursor,
        limit: ON_PAGE_ELEMENTS_LIMIT,
        withPending: cursor === null
    });

    const entries = [...(page.pending ?? []).reverse(), ...page.entries];
    const amounts = await wallet.readAmounts(
        flameHistoryContracts(entries).map(toFlameOutputBytes)
    );

    return {
        items: entries
            .map(entry => toFlameHistoryItem(entry, amounts))
            .filter(item => item !== null),
        older: page.older
    };
}
