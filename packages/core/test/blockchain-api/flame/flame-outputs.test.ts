import { describe, expect, it } from 'vitest';

import type { FlameApiUnspentEntry, FlameOutputAmount } from '../../../src';
import { FlameOutputs, toFlameOutputBytes } from '../../../src';

const hex = (fill: string) => fill.repeat(64);

const entry = (id: string): FlameApiUnspentEntry => ({ id: hex(id), bytes: 'AQID' });

const counted = (
    qty: bigint,
    isNative = true
): Extract<FlameOutputAmount, { status: 'counted' }> => ({
    status: 'counted',
    qty,
    flavor: isNative ? 'native' : hex('f'),
    isNative
});

describe('FlameOutputs', () => {
    const outputs = FlameOutputs.fromUnspent(
        [entry('1'), entry('2'), entry('3')],
        new Map<string, FlameOutputAmount>([
            [hex('1'), counted(100n)],
            [hex('2'), counted(50n)],
            [hex('3'), { status: 'unreadable' }]
        ])
    );

    it('sums readable unspent outputs into the balance', () => {
        expect(outputs.balance.weiAmount).toBe(150n);
        expect(outputs.hasUnreadableUnspent).toBe(true);
    });

    it('spends only readable outputs', () => {
        expect(outputs.spendable.map(output => output.id)).toEqual([hex('1'), hex('2')]);
    });

    it('leaves tokens of another flavor and non-token outputs out of the balance', () => {
        const foreign = FlameOutputs.fromUnspent(
            [entry('6'), entry('7')],
            new Map<string, FlameOutputAmount>([
                [hex('6'), counted(500n, false)],
                [hex('7'), { status: 'notToken' }]
            ])
        );

        expect(foreign.balance.weiAmount).toBe(0n);
        expect(foreign.unspent).toEqual([]);
        expect(foreign.hasUnreadableUnspent).toBe(false);
    });

    it('decodes base64 bytes into plain Uint8Arrays and keeps a missing note null', () => {
        const bytes = toFlameOutputBytes(entry('1'));

        expect(bytes.contract.constructor).toBe(Uint8Array);
        expect(Array.from(bytes.contract)).toEqual([1, 2, 3]);
        expect(bytes.note).toBeNull();
        expect(toFlameOutputBytes({ ...entry('1'), note: 'BAU=' }).note).toEqual(
            new Uint8Array([4, 5])
        );
    });
});
