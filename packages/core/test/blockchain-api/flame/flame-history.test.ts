import { describe, expect, it } from 'vitest';

import type { FlameApiHistoryEntry, FlameOutputAmount } from '../../../src';
import { flameHistoryContracts, toFlameActivityItem } from '../../../src';

const hex = (fill: string) => fill.repeat(64);

const contract = (id: string) => ({ id: hex(id), predicate: hex('a'), bytes: 'AQID' });

const entry = (
    txid: string,
    created: string[],
    spent: string[],
    confirmed?: { height: number; time: number }
): FlameApiHistoryEntry => ({
    txid: hex(txid),
    fee_sparks: '1000',
    created: created.map(contract),
    spent: spent.map(contract),
    others_spent: [],
    others_created: [],
    ...(confirmed ?? { received_at: 1_760_000_500 })
});

const counted = (qty: bigint, memo?: string): FlameOutputAmount => ({
    status: 'counted',
    qty,
    flavor: 'native',
    isNative: true,
    ...(memo !== undefined && { memo })
});

const amounts = new Map<string, FlameOutputAmount>([
    [hex('1'), counted(100_000n)],
    [hex('2'), counted(39_000n)],
    [hex('3'), counted(5_000n, 'rent')],
    [hex('4'), { status: 'unreadable' }],
    [hex('5'), { status: 'counted', qty: 9n, flavor: hex('f'), isNative: false }],
    [hex('6'), { status: 'notToken' }]
]);

describe('toFlameActivityItem', () => {
    it('counts a send as spent minus change minus the fee, with the fee apart', () => {
        const item = toFlameActivityItem(
            entry('a', ['2'], ['1'], { height: 12, time: 1_760_000_000 }),
            amounts
        );

        expect(item).toMatchObject({
            txid: hex('a'),
            height: 12,
            timestamp: 1_760_000_000_000,
            isPending: false,
            isInitiator: true,
            hasUnreadableOutputs: false,
            memo: null
        });
        expect(item?.value.weiAmount).toBe(60_000n);
        expect(item?.fee?.weiAmount).toBe(1_000n);
    });

    it('counts a receipt as its created outputs and carries their memo', () => {
        const item = toFlameActivityItem(
            entry('b', ['3'], [], { height: 13, time: 1_760_000_100 }),
            amounts
        );

        expect(item?.isInitiator).toBe(false);
        expect(item?.value.weiAmount).toBe(5_000n);
        expect(item?.fee).toBeNull();
        expect(item?.memo).toBe('rent');
    });

    it('marks a mempool entry pending and dates it by when the node admitted it', () => {
        const item = toFlameActivityItem(entry('c', ['3'], []), amounts);

        expect(item?.isPending).toBe(true);
        expect(item?.height).toBeNull();
        expect(item?.timestamp).toBe(1_760_000_500_000);
    });

    it('shows a transaction spending an unreadable own output as sent', () => {
        const item = toFlameActivityItem(entry('d', [], ['4']), amounts);

        expect(item?.isInitiator).toBe(true);
        expect(item?.hasUnreadableOutputs).toBe(true);
        expect(item?.value.weiAmount).toBe(0n);
    });

    it('drops an entry that only moves other tokens or non-token contracts', () => {
        expect(toFlameActivityItem(entry('e', ['5', '6'], []), amounts)).toBeNull();
    });
});

describe('toFlameActivityItem counterparty', () => {
    const other = (fill: string, address?: string) => ({
        predicate: hex(fill),
        ...(address !== undefined && { address })
    });

    it('names whoever paid a receipt', () => {
        const item = toFlameActivityItem(
            {
                ...entry('a', ['3'], []),
                others_spent: [other('b'), other('c', 't1payer')],
                others_created: [other('d', 't1payerchange')]
            },
            amounts
        );

        expect(item?.counterpartyAddress).toBe('t1payer');
    });

    it('names whom a send paid when only the wallet’s coins were spent', () => {
        const item = toFlameActivityItem(
            { ...entry('b', ['2'], ['1']), others_created: [other('e', 't1recipient')] },
            amounts
        );

        expect(item?.counterpartyAddress).toBe('t1recipient');
    });

    it('names no recipient when someone else’s coins were spent too', () => {
        const item = toFlameActivityItem(
            {
                ...entry('c', [], ['1']),
                others_spent: [other('f', 't1cosigner')],
                others_created: [other('g', 't1cosignerchange')]
            },
            amounts
        );

        expect(item?.isInitiator).toBe(true);
        expect(item?.counterpartyAddress).toBeNull();
    });
});

describe('flame history helpers', () => {
    it('collects every created and spent contract for reading amounts', () => {
        expect(
            flameHistoryContracts([entry('a', ['2'], ['1']), entry('b', ['3'], [])]).map(c => c.id)
        ).toEqual([hex('2'), hex('1'), hex('3')]);
    });
});
