import { describe, expect, it, vi } from 'vitest';

import { FlameOutputs } from '@safely/core';
import { Logger } from '@safely/sync';

import { cacheSchemas } from '../../../src/shared/query-core/cache-config';
import { createPersister } from '../../../src/shared/query-core/persistence';
import { deserialize, serialize } from '../../../src/shared/query-core/serialization';

const hex = (char: string) => char.repeat(64);

const unspent = {
    entries: [
        { id: hex('1'), bytes: 'AAEC', note: 'AwQF' },
        { id: hex('2'), bytes: 'BgcI' }
    ],
    amounts: {
        [hex('1')]: {
            status: 'counted' as const,
            qty: 123_456_789_012_345_678n,
            flavor: '01' + '00'.repeat(31),
            isNative: true,
            memo: 'rent'
        },
        [hex('2')]: { status: 'unreadable' as const }
    }
};

describe('sFlameWalletUnspent cache entry', () => {
    it('survives the persister round trip and rebuilds the same outputs', () => {
        const restored = cacheSchemas.sFlameWalletUnspent.parse(deserialize(serialize(unspent)));

        expect(restored).toEqual(unspent);

        const outputs = FlameOutputs.fromUnspent(
            restored.entries,
            new Map(Object.entries(restored.amounts))
        );
        expect(outputs.balance.weiAmount).toBe(123_456_789_012_345_678n);
        expect(outputs.hasUnreadableUnspent).toBe(true);
    });

    it('rejects an amount whose quantity is not a bigint', () => {
        const broken = {
            ...unspent,
            amounts: { [hex('1')]: { ...unspent.amounts[hex('1')], qty: 1 } }
        };

        expect(cacheSchemas.sFlameWalletUnspent.safeParse(broken).success).toBe(false);
    });

    it('writes the unspent outputs to disk without memos and leaves them in memory', async () => {
        const state = { data: unspent, dataUpdatedAt: 1, status: 'success' as const };
        const disk = await persistUnspent(state);

        await vi.waitFor(() => expect(disk.size).toBe(1));
        expect([...disk.values()][0]).not.toContain('rent');
        expect(state.data.amounts[hex('1')].memo).toBe('rent');
    });

    it('does not write unspent outputs it cannot strip of memos', async () => {
        const broken = {
            ...unspent,
            amounts: { ...unspent.amounts, [hex('3')]: { status: 'new' } }
        };
        const disk = await persistUnspent({ data: broken, dataUpdatedAt: 1, status: 'success' });

        await vi.waitFor(() => expect(disk.size).toBe(1));
        expect([...disk.values()][0]).not.toContain('rent');
        expect([...disk.values()][0]).not.toContain('flame-blockchain');
    });
});

async function persistUnspent(state: { data: unknown; dataUpdatedAt: number; status: 'success' }) {
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
                    meta: { persist: true, schemaKey: 'sFlameWalletUnspent' },
                    state: state as never
                }
            ]
        }
    });

    return disk;
}
