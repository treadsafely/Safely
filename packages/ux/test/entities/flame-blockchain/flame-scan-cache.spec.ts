import { describe, expect, it, vi } from 'vitest';

import { FlameOutputs } from '@safely/core';
import { Logger } from '@safely/sync';

import { cacheSchemas } from '../../../src/shared/query-core/cache-config';
import { createPersister } from '../../../src/shared/query-core/persistence';
import { deserialize, serialize } from '../../../src/shared/query-core/serialization';

const hex = (char: string) => char.repeat(64);

const scan = {
    entries: [
        {
            id: hex('1'),
            height: 10,
            txid: hex('a'),
            predicate: hex('f'),
            bytes: 'AAEC',
            note: 'AwQF'
        },
        {
            id: hex('2'),
            height: 12,
            txid: hex('b'),
            predicate: hex('f'),
            bytes: 'BgcI',
            spent: { height: 14, txid: hex('c') }
        }
    ],
    amounts: {
        [hex('1')]: {
            status: 'counted' as const,
            qty: 123_456_789_012_345_678n,
            flavor: '01' + '00'.repeat(31),
            memo: 'rent'
        },
        [hex('2')]: { status: 'unreadable' as const }
    }
};

describe('sFlameWalletScan cache entry', () => {
    it('survives the persister round trip and rebuilds the same outputs', () => {
        const restored = cacheSchemas.sFlameWalletScan.parse(deserialize(serialize(scan)));

        expect(restored).toEqual(scan);

        const outputs = FlameOutputs.fromScan(
            restored.entries,
            new Map(Object.entries(restored.amounts))
        );
        expect(outputs.balance.weiAmount).toBe(123_456_789_012_345_678n);
        expect(outputs.history.find(item => item.txid === hex('a'))?.memo).toBe('rent');
    });

    it('rejects an amount whose quantity is not a bigint', () => {
        const broken = { ...scan, amounts: { [hex('1')]: { ...scan.amounts[hex('1')], qty: 1 } } };

        expect(cacheSchemas.sFlameWalletScan.safeParse(broken).success).toBe(false);
    });

    it('writes the scan to disk without memos and leaves them in memory', async () => {
        const state = { data: scan, dataUpdatedAt: 1, status: 'success' as const };
        const disk = await persistScan(state);

        await vi.waitFor(() => expect(disk.size).toBe(1));
        expect([...disk.values()][0]).not.toContain('rent');
        expect(state.data.amounts[hex('1')].memo).toBe('rent');
    });

    it('does not write a scan it cannot strip of memos', async () => {
        const broken = { ...scan, amounts: { ...scan.amounts, [hex('3')]: { status: 'new' } } };
        const disk = await persistScan({ data: broken, dataUpdatedAt: 1, status: 'success' });

        await vi.waitFor(() => expect(disk.size).toBe(1));
        expect([...disk.values()][0]).not.toContain('rent');
        expect([...disk.values()][0]).not.toContain('flame-blockchain');
    });
});

async function persistScan(state: { data: unknown; dataUpdatedAt: number; status: 'success' }) {
    const disk = new Map<string, string>();
    const persister = createPersister(
        {
            setItem: async (key, value) => void disk.set(key, value),
            getItem: async key => disk.get(key) ?? null,
            removeItem: async key => void disk.delete(key),
            clear: async () => disk.clear()
        },
        new Logger()
    );

    await persister.persistClient({
        timestamp: 1,
        buster: '',
        clientState: {
            mutations: [],
            queries: [
                {
                    queryKey: ['flame-blockchain'],
                    queryHash: 'flame-blockchain',
                    dehydratedAt: 1,
                    meta: { persist: true, schemaKey: 'sFlameWalletScan' },
                    state: state as never
                }
            ]
        }
    });

    return disk;
}
