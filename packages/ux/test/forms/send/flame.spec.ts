import { describe, expect, it, vi } from 'vitest';

import {
    BLOCKCHAIN_NAME,
    BTC_ASSET,
    FLAME_ASSET,
    FiatAsset,
    FiatAssetId,
    FLAME_MEMO_MAX_BYTES,
    FlameAssetAmount,
    PortfolioNetworkType,
    Rate,
    type RatedCryptoAssetAmount,
    toBig
} from '@safely/core';

import { makeMockAsset, makeMockInput, startActor } from './test-helpers';
import { SendFormError } from '../../../src/features/forms/send/errors';

const FLAME_ADDRESS =
    'tf15gtu9mtvytf2w86z7ypdxx3c78fmt95elvx52hlzrlvfs7gw2dj0gqceswac8y9vqzxskedwllg8tf8jpc055vtshxdha59gvggpvasqpc3mr';
const OWN_FLAME_ADDRESS = 'tf1own';

const USD = new FiatAsset(new FiatAssetId('USD'), 'US Dollar');

function makeFlameAsset(): RatedCryptoAssetAmount {
    return {
        amount: FlameAssetAmount.fromWeiAmount(5_000_000_000n),
        price: new Rate(FLAME_ASSET, USD, toBig(0))
    };
}

function makeFlameInput(opts: Parameters<typeof makeMockInput>[0] = {}) {
    return makeMockInput({
        networkType: PortfolioNetworkType.TESTNET,
        flameWalletAddress: OWN_FLAME_ADDRESS,
        ratedAssets: [makeMockAsset(), makeFlameAsset()],
        initialAmountInputType: 'fiat',
        ...opts
    });
}

describe('sendFormMachine — Flame recipient', () => {
    it('picks FLM on the amount step for a Flame address and switches to crypto input', () => {
        const actor = startActor(makeFlameInput());
        actor.send({ type: 'SET_RECIPIENT', value: FLAME_ADDRESS });

        expect(actor.getSnapshot().context.parsed.recipient?.blockchain).toBe(
            BLOCKCHAIN_NAME.FLAME
        );

        actor.send({ type: 'NEXT' });
        const { context } = actor.getSnapshot();

        expect(context.parsed.asset?.amount.asset.id.isEq(FLAME_ASSET.id)).toBe(true);
        expect(context.values.amountInputType).toBe('crypto');
    });

    it('ignores a switch to fiat input for FLM', () => {
        const persistAmountInputType = vi.fn();
        const actor = startActor(makeFlameInput({ persistAmountInputType }));
        actor.send({ type: 'SET_RECIPIENT', value: FLAME_ADDRESS });
        actor.send({ type: 'NEXT' });

        actor.send({ type: 'SET_AMOUNT_INPUT_TYPE', value: 'fiat' });

        expect(actor.getSnapshot().context.values.amountInputType).toBe('crypto');
        expect(persistAmountInputType).not.toHaveBeenCalled();
    });

    it('submits a FLAME result', () => {
        const onSubmit = vi.fn();
        const actor = startActor(makeFlameInput({ onSubmit, shouldResetForm: false }));
        actor.send({ type: 'SET_RECIPIENT', value: FLAME_ADDRESS });
        actor.send({ type: 'NEXT' });
        actor.send({ type: 'SET_AMOUNT', value: '1.5' });
        actor.send({ type: 'NEXT' });

        expect(actor.getSnapshot().matches('submitted')).toBe(true);
        const result = onSubmit.mock.calls[0]?.[0];
        expect(result.blockchain).toBe(BLOCKCHAIN_NAME.FLAME);
        expect(result.amount.cryptoAssetAmount.weiAmount).toBe(150_000_000n);
    });

    it('submits the memo with a FLAME result, even after entering max', async () => {
        const onSubmit = vi.fn();
        const actor = startActor(
            makeFlameInput({
                onSubmit,
                shouldResetForm: false,
                fetchMaxValue: async () => FlameAssetAmount.fromWeiAmount(4_000_000_000n)
            })
        );
        actor.send({ type: 'SET_RECIPIENT', value: FLAME_ADDRESS });
        actor.send({ type: 'NEXT' });
        await vi.waitFor(() => {
            if (!actor.getSnapshot().context.parsed.maxValue) throw new Error('no max yet');
        });
        actor.send({ type: 'ENTER_MAX' });
        actor.send({ type: 'SET_MEMO', value: 'invoice #42' });
        actor.send({ type: 'NEXT' });

        expect(onSubmit.mock.calls[0]?.[0].memo).toBe('invoice #42');
    });

    it('clamps the memo to the byte limit', () => {
        const actor = startActor(makeFlameInput());
        actor.send({ type: 'SET_RECIPIENT', value: FLAME_ADDRESS });
        actor.send({ type: 'NEXT' });

        actor.send({ type: 'SET_MEMO', value: 'a'.repeat(FLAME_MEMO_MAX_BYTES + 1) });

        expect(actor.getSnapshot().context.values.memo).toHaveLength(FLAME_MEMO_MAX_BYTES);
    });

    it('drops the memo for a BTC recipient and when the recipient changes', () => {
        const actor = startActor(makeFlameInput());
        actor.send({ type: 'SET_RECIPIENT', value: FLAME_ADDRESS });
        actor.send({ type: 'NEXT' });
        actor.send({ type: 'SET_MEMO', value: 'hello' });
        actor.send({ type: 'PREV' });
        actor.send({ type: 'SET_RECIPIENT', value: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx' });
        actor.send({ type: 'NEXT' });

        expect(actor.getSnapshot().context.values.memo).toBe('');

        actor.send({ type: 'SET_MEMO', value: 'hello' });

        expect(actor.getSnapshot().context.values.memo).toBe('');
    });

    it('rejects a Flame address when the wallet has no Flame chain', () => {
        const actor = startActor(makeFlameInput({ flameWalletAddress: null }));
        actor.send({ type: 'SET_RECIPIENT', value: FLAME_ADDRESS });

        expect(actor.getSnapshot().context.errors.recipient).toBe(
            SendFormError.UNSUPPORTED_BLOCKCHAIN
        );
    });

    it('flags a transfer to the own Flame address', () => {
        const actor = startActor(makeFlameInput({ flameWalletAddress: FLAME_ADDRESS }));
        actor.send({ type: 'SET_RECIPIENT', value: FLAME_ADDRESS });

        expect(actor.getSnapshot().matches({ editing: { recipient: 'selfTransfer' } })).toBe(true);
    });

    it('keeps the remembered input type for a BTC recipient', () => {
        const actor = startActor(makeFlameInput());
        actor.send({ type: 'SET_RECIPIENT', value: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx' });
        actor.send({ type: 'NEXT' });
        const { context } = actor.getSnapshot();

        expect(context.parsed.asset?.amount.asset.id.isEq(BTC_ASSET.id)).toBe(true);
        expect(context.values.amountInputType).toBe('fiat');
    });
});
