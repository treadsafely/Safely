import { describe, expect, it } from 'vitest';

import type { FlameApiScanEntry, FlameOutputAmount } from '../../../src';
import { FLAME_NATIVE_FLAVOR, FlameOutputs, toFlameOutputBytes } from '../../../src';

const hex = (fill: string) => fill.repeat(64);

const entry = (
    id: string,
    height: number,
    txid: string,
    spent?: { height: number; txid: string }
): FlameApiScanEntry => ({
    id: hex(id),
    height,
    txid: hex(txid),
    predicate: hex('a'),
    bytes: 'AQID',
    ...(spent && { spent: { height: spent.height, txid: hex(spent.txid) } })
});

const counted = (qty: bigint, flavor = FLAME_NATIVE_FLAVOR): FlameOutputAmount => ({
    status: 'counted',
    qty,
    flavor
});

describe('FlameOutputs', () => {
    const entries = [
        entry('1', 10, 'a', { height: 20, txid: 'c' }),
        entry('2', 12, 'b'),
        entry('3', 20, 'c'),
        entry('4', 25, 'd')
    ];
    const amounts = new Map<string, FlameOutputAmount>([
        [hex('1'), counted(100n)],
        [hex('2'), counted(50n)],
        [hex('3'), counted(30n)],
        [hex('4'), { status: 'unreadable' }]
    ]);
    const outputs = FlameOutputs.fromScan(entries, amounts);

    it('sums readable unspent outputs into the balance', () => {
        expect(outputs.balance.weiAmount).toBe(80n);
        expect(outputs.hasUnreadableUnspent).toBe(true);
    });

    it('nets receipts against spends per transaction, newest first', () => {
        expect(
            outputs.history.map(item => ({
                txid: item.txid[0],
                height: item.height,
                isInitiator: item.isInitiator,
                value: item.value.weiAmount,
                hasUnreadableOutputs: item.hasUnreadableOutputs
            }))
        ).toEqual([
            { txid: 'd', height: 25, isInitiator: false, value: 0n, hasUnreadableOutputs: true },
            { txid: 'c', height: 20, isInitiator: true, value: 70n, hasUnreadableOutputs: false },
            { txid: 'b', height: 12, isInitiator: false, value: 50n, hasUnreadableOutputs: false },
            { txid: 'a', height: 10, isInitiator: false, value: 100n, hasUnreadableOutputs: false }
        ]);
    });

    it('shows a transaction spending an unreadable own output as sent, not received', () => {
        const spentUnreadable = FlameOutputs.fromScan(
            [entry('7', 50, 'g', { height: 60, txid: 'h' }), entry('8', 60, 'h')],
            new Map<string, FlameOutputAmount>([
                [hex('7'), { status: 'unreadable' }],
                [hex('8'), counted(5n)]
            ])
        );

        const [spend] = spentUnreadable.history;
        expect(spend.txid).toBe(hex('h'));
        expect(spend.isInitiator).toBe(true);
        expect(spend.hasUnreadableOutputs).toBe(true);
    });

    it('leaves tokens of another flavor out of the balance and the history', () => {
        const foreign = FlameOutputs.fromScan(
            [entry('6', 40, 'f')],
            new Map([[hex('6'), counted(500n, hex('f'))]])
        );

        expect(foreign.balance.weiAmount).toBe(0n);
        expect(foreign.hasUnreadableUnspent).toBe(false);
        expect(foreign.history).toEqual([]);
    });

    it('leaves non-token outputs out of the history', () => {
        const withContract = FlameOutputs.fromScan(
            [entry('5', 30, 'e')],
            new Map([[hex('5'), { status: 'notToken' }]])
        );

        expect(withContract.history).toEqual([]);
        expect(withContract.balance.weiAmount).toBe(0n);
    });

    it('decodes base64 bytes into plain Uint8Arrays and keeps a missing note null', () => {
        const bytes = toFlameOutputBytes(entry('1', 10, 'a'));

        expect(bytes.contract.constructor).toBe(Uint8Array);
        expect(Array.from(bytes.contract)).toEqual([1, 2, 3]);
        expect(bytes.note).toBeNull();
        expect(toFlameOutputBytes({ ...entry('1', 10, 'a'), note: 'BAU=' }).note).toEqual(
            new Uint8Array([4, 5])
        );
    });
});
