import { describe, expect, it } from 'vitest';

import type { BtcApiTx } from '@safely/core';

import { btcTxToActivityItem } from '../../../src/entities/activity/api';

const OWN = 'own-address';

function io(address: string, value: number) {
    return { addresses: [address], value: String(value), isOwn: address === OWN };
}

function tx(params: {
    vin: ReturnType<typeof io>[];
    vout: ReturnType<typeof io>[];
    fees?: number;
}): BtcApiTx {
    return {
        txid: 'txid',
        vin: params.vin,
        vout: params.vout,
        blockHeight: 1,
        confirmations: 1,
        blockTime: 1,
        fees: params.fees === undefined ? undefined : String(params.fees)
    };
}

function convert(params: Parameters<typeof tx>[0]) {
    const item = btcTxToActivityItem(tx(params), null);
    if (!item) {
        throw new Error('expected an activity item');
    }

    return {
        isInitiator: item.transaction.isInitiator,
        value: item.transaction.value.weiAmount,
        fee: item.transaction.fee?.amount.weiAmount,
        fromAddress: item.transaction.fromAddress,
        toAddress: item.transaction.toAddress
    };
}

describe('btcTxToActivityItem', () => {
    it('counts foreign outputs as sent when every input is own', () => {
        expect(
            convert({
                vin: [io(OWN, 10_000)],
                vout: [io('recipient', 7_000), io(OWN, 2_500)],
                fees: 500
            })
        ).toEqual({
            isInitiator: true,
            value: 7_000n,
            fee: 500n,
            fromAddress: OWN,
            toAddress: 'recipient'
        });
    });

    it('counts own outputs as received when no input is own', () => {
        expect(
            convert({
                vin: [io('sender', 10_000)],
                vout: [io(OWN, 6_000), io('sender', 3_500)],
                fees: 500
            })
        ).toEqual({
            isInitiator: false,
            value: 6_000n,
            fee: 500n,
            fromAddress: 'sender',
            toAddress: OWN
        });
    });

    it('does not count outputs funded by foreign inputs as sent', () => {
        expect(
            convert({
                vin: [io(OWN, 10_000), io('other', 1_000_000)],
                vout: [io('recipient', 8_000), io('other-recipient', 1_000_000), io(OWN, 1_000)],
                fees: 1_000
            })
        ).toEqual({
            isInitiator: true,
            value: 8_000n,
            fee: 1_000n,
            fromAddress: OWN,
            toAddress: 'other-recipient'
        });
    });

    it('reports a receive when the address gets back more than it contributed', () => {
        expect(
            convert({
                vin: [io(OWN, 10_000), io('other', 100_000)],
                vout: [io(OWN, 50_000), io('other', 59_000)],
                fees: 1_000
            })
        ).toEqual({
            isInitiator: false,
            value: 40_000n,
            fee: 1_000n,
            fromAddress: 'other',
            toAddress: OWN
        });
    });

    it('does not report a negative amount when the fee exceeds the own loss', () => {
        expect(
            convert({
                vin: [io(OWN, 10_000), io('other', 100_000)],
                vout: [io(OWN, 9_800), io('other', 99_200)],
                fees: 1_000
            }).value
        ).toBe(0n);
    });

    it('treats a coinbase transaction as a receive', () => {
        const coinbase = tx({ vin: [], vout: [io(OWN, 625_000_000)] });
        coinbase.vin = [{ coinbase: '03ab', addresses: ['coinbase'] }];
        const item = btcTxToActivityItem(coinbase, null);

        expect(item?.transaction.isInitiator).toBe(false);
        expect(item?.transaction.value.weiAmount).toBe(625_000_000n);
    });
});
