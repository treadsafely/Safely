import { describe, expect, it, vi } from 'vitest';

import type {
    FlameApi,
    FlameApiHistoryEntry,
    FlameApiHistoryResult,
    FlameOutputAmount,
    FlameOutputBytes
} from '@safely/core';

import { fetchFlameActivity } from '../../../src/entities/flame-blockchain/api';

const hex = (fill: string) => fill.repeat(64);
const ADDRESS = 't1selfi1self';

const entry = (txid: string, height?: number): FlameApiHistoryEntry => ({
    txid: hex(txid),
    fee_sparks: '0',
    created: [{ id: hex(txid), predicate: hex('a'), bytes: 'AQID' }],
    spent: [],
    others_spent: [],
    others_created: [],
    ...(height === undefined ? { received_at: 1 } : { height, time: height })
});

const result = (page: Partial<FlameApiHistoryResult>): FlameApiHistoryResult => ({
    entries: [],
    older: null,
    newer: null,
    has_newer: false,
    ...page
});

const wallet = {
    receivingAddress: ADDRESS,
    readAmounts: (outputs: FlameOutputBytes[]) =>
        Promise.resolve(
            new Map<string, FlameOutputAmount>(
                outputs.map(output => [
                    output.id,
                    { status: 'counted', qty: 1n, flavor: 'native', isNative: true }
                ])
            )
        )
};

const txids = (items: { txid: string }[]) => items.map(item => item.txid[0]);

describe('fetchFlameActivity', () => {
    it('puts the mempool on top of the first page, newest first', async () => {
        const history = vi.fn<FlameApi['history']>().mockResolvedValue(
            result({
                entries: [entry('c', 3), entry('b', 2)],
                pending: [entry('d'), entry('e')],
                older: 'older:2'
            })
        );

        const page = await fetchFlameActivity({ history } as unknown as FlameApi, wallet, null);

        expect(txids(page.items)).toEqual(['e', 'd', 'c', 'b']);
        expect(page.items.map(item => item.isPending)).toEqual([true, true, false, false]);
        expect(page.older).toBe('older:2');
        expect(history).toHaveBeenCalledWith([ADDRESS], {
            cursor: null,
            limit: 25,
            withPending: true
        });
    });

    it('reads an older page by its cursor without the mempool', async () => {
        const history = vi
            .fn<FlameApi['history']>()
            .mockResolvedValue(result({ entries: [entry('a', 1)] }));

        const page = await fetchFlameActivity(
            { history } as unknown as FlameApi,
            wallet,
            'older:2'
        );

        expect(txids(page.items)).toEqual(['a']);
        expect(page.older).toBeNull();
        expect(history).toHaveBeenCalledWith([ADDRESS], {
            cursor: 'older:2',
            limit: 25,
            withPending: false
        });
    });
});
