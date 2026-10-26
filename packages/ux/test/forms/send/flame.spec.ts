import { describe, expect, it, vi } from 'vitest';

import {
    BLOCKCHAIN_NAME,
    BTC_ASSET,
    FLAME_ASSET,
    FiatAsset,
    FiatAssetId,
    FlameAssetAmount,
    PortfolioNetworkType,
    Rate,
    type RatedCryptoAssetAmount,
    toBig
} from '@safely/core';

import { makeMockAsset, makeMockInput, startActor } from './test-helpers';
import { SendFormError } from '../../../src/features/forms/send/errors';

const FLAME_ADDRESS =
    't1tz5t5l8fu7qvx2az3mxuzk2s3690ejm5t9kx720efmls2546gvmqdxl7qzi1ve6sv7gvjqs6elps95lx78g0vkz55psulpa5fdga8jy9mh38mfpq8pwqaf';
const MAINNET_FLAME_ADDRESS =
    'f1tz5t5l8fu7qvx2az3mxuzk2s3690ejm5t9kx720efmls2546gvmqxyvkxme1ve6sv7gvjqs6elps95lx78g0vkz55psulpa5fdga8jy9mh38mfpqww34vv';
const OWN_FLAME_ADDRESS = 't1owni1own';
const FLAME_MEMO_MAX_BYTES = globalThis.flameSdk.memoMaxBytes();

const USD = new FiatAsset(new FiatAssetId('USD'), 'US Dollar');

function makeFlameAsset(): RatedCryptoAssetAmount {
    return {
        amount: FlameAssetAmount.fromWeiAmount(5_000_000_000n),
        price: new Rate(FLAME_ASSET, USD, toBig(0))
    };
}

const BTC_TESTNET_ADDRESS = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';

function makeFlameInput(opts: Parameters<typeof makeMockInput>[0] = {}) {
    return makeMockInput({
        networkType: PortfolioNetworkType.TESTNET,
        ownAddresses: { [BLOCKCHAIN_NAME.FLAME]: OWN_FLAME_ADDRESS },
        ratedAssets: [makeFlameAsset()],
        initialAmountInputType: 'fiat',
        ...opts
    });
}

function makeBtcTestnetInput(opts: Parameters<typeof makeMockInput>[0] = {}) {
    return makeMockInput({
        networkType: PortfolioNetworkType.TESTNET,
        ratedAssets: [makeMockAsset()],
        initialAmountInputType: 'fiat',
        ...opts
    });
}

describe('sendFormMachine — devnet wallet', () => {
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

    it('rejects a BTC address', () => {
        const actor = startActor(makeFlameInput());
        actor.send({ type: 'SET_RECIPIENT', value: BTC_TESTNET_ADDRESS });

        expect(actor.getSnapshot().context.errors.recipient).toBe(
            SendFormError.UNSUPPORTED_BLOCKCHAIN
        );
    });

    it('flags a transfer to the own Flame address', () => {
        const actor = startActor(
            makeFlameInput({ ownAddresses: { [BLOCKCHAIN_NAME.FLAME]: FLAME_ADDRESS } })
        );
        actor.send({ type: 'SET_RECIPIENT', value: FLAME_ADDRESS });

        expect(actor.getSnapshot().matches({ editing: { recipient: 'selfTransfer' } })).toBe(true);
    });
});

describe('sendFormMachine — BTC wallet on testnet', () => {
    it('rejects a Flame address as an invalid one', () => {
        const actor = startActor(makeBtcTestnetInput());
        actor.send({ type: 'SET_RECIPIENT', value: FLAME_ADDRESS });

        expect(actor.getSnapshot().context.errors.recipient).toBe(
            SendFormError.INVALID_WALLET_ADDRESS
        );
    });

    it('rejects a mainnet Flame address on a mainnet BTC wallet as an invalid one', () => {
        const actor = startActor(makeMockInput({ ratedAssets: [makeMockAsset()] }));
        actor.send({ type: 'SET_RECIPIENT', value: MAINNET_FLAME_ADDRESS });

        expect(actor.getSnapshot().context.errors.recipient).toBe(
            SendFormError.INVALID_WALLET_ADDRESS
        );
    });

    it('ignores a memo and keeps the remembered input type for a BTC recipient', () => {
        const actor = startActor(makeBtcTestnetInput());
        actor.send({ type: 'SET_RECIPIENT', value: BTC_TESTNET_ADDRESS });
        actor.send({ type: 'NEXT' });
        actor.send({ type: 'SET_MEMO', value: 'hello' });
        const { context } = actor.getSnapshot();

        expect(context.parsed.asset?.amount.asset.id.isEq(BTC_ASSET.id)).toBe(true);
        expect(context.values.amountInputType).toBe('fiat');
        expect(context.values.memo).toBe('');
    });
});

describe('sendFormMachine — wallet with both chains', () => {
    function makeBothChainsInput() {
        return makeMockInput({
            networkType: PortfolioNetworkType.TESTNET,
            ownAddresses: {
                [BLOCKCHAIN_NAME.BTC]: 'tb1qown',
                [BLOCKCHAIN_NAME.FLAME]: OWN_FLAME_ADDRESS
            },
            ratedAssets: [makeMockAsset(), makeFlameAsset()]
        });
    }

    it('sends FLM to a Flame address and BTC to a BTC address', () => {
        const flameActor = startActor(makeBothChainsInput());
        flameActor.send({ type: 'SET_RECIPIENT', value: FLAME_ADDRESS });
        flameActor.send({ type: 'NEXT' });

        expect(
            flameActor.getSnapshot().context.parsed.asset?.amount.asset.id.isEq(FLAME_ASSET.id)
        ).toBe(true);

        const btcActor = startActor(makeBothChainsInput());
        btcActor.send({ type: 'SET_RECIPIENT', value: BTC_TESTNET_ADDRESS });
        btcActor.send({ type: 'NEXT' });

        expect(
            btcActor.getSnapshot().context.parsed.asset?.amount.asset.id.isEq(BTC_ASSET.id)
        ).toBe(true);
    });
});
