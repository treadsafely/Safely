/* eslint-disable @typescript-eslint/consistent-type-imports */

import { act, cleanup } from '@testing-library/react';
import type { Mock } from 'vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BtcApi, BtcTransactionTemplate } from '@safely/core';
import { PortfolioNetworkType, PortfolioWatchOnlyBtc } from '@safely/core';

import * as accountState from '../../../src/entities/account/account-state';
import { utxo } from '../../../src/entities/btc-blockchain/keys';
import {
    BroadcastedBtcTx,
    useSetLastBroadcastedBtcTx
} from '../../../src/entities/btc-blockchain/last-broadcasted-btc-tx';
import {
    createMockSyncAccount,
    createTestAppContext,
    renderHookWithProviders
} from '../../harness';

vi.mock('../../../src/entities/account/account-state', async () => {
    const actual = await vi.importActual<
        typeof import('../../../src/entities/account/account-state')
    >('../../../src/entities/account/account-state');
    return {
        ...actual,
        useActiveAccount: vi.fn(),
        useActiveAccountStoreSlot: vi.fn()
    };
});

const SENDER_XPUB =
    'xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj';
const OWN_RECEIVER = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
const UNRELATED = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
const EXTERNAL = 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3';

const api = { id: 'btc-api' } as unknown as BtcApi;

function watchOnly(input: string): PortfolioWatchOnlyBtc {
    return PortfolioWatchOnlyBtc.create(
        PortfolioWatchOnlyBtc.resolveUserInput(input, PortfolioNetworkType.MAINNET),
        { name: input.slice(-4), icon: { type: 'emoji', value: '👀' } }
    );
}

function broadcasted(outputs: string[]): BroadcastedBtcTx {
    return BroadcastedBtcTx.fromTransactionTemplate({
        sendResult: { txId: 'tx-1' },
        inputs: [{ txid: 'prev', vout: 0, value: '10000', address: 'sender-address' }],
        outputs: outputs.map(address => ({ address, value: 1000n })),
        estimation: { fee: { amount: { weiAmount: 100n } } },
        wallet: { xpub: SENDER_XPUB }
    } as unknown as BtcTransactionTemplate);
}

describe('useSetLastBroadcastedBtcTx', () => {
    afterEach(cleanup);

    it('invalidates the sender by xpub and own receivers by address, nothing else', async () => {
        const portfolios = [SENDER_XPUB, OWN_RECEIVER, UNRELATED].map(watchOnly);
        const [sender, ownReceiver, unrelated] = portfolios.map(p => p.wallet);

        (accountState.useActiveAccount as Mock).mockReturnValue(createMockSyncAccount());
        (accountState.useActiveAccountStoreSlot as Mock).mockImplementation((slot: string) =>
            slot === 'portfolios' ? portfolios : undefined
        );

        const { result, queryClient } = renderHookWithProviders(
            () => useSetLastBroadcastedBtcTx(),
            { appContext: createTestAppContext() }
        );

        const keyOf = (wallet: typeof sender) => utxo.wallet(wallet).params({ api }).toKey();
        for (const wallet of [sender, ownReceiver, unrelated]) {
            queryClient.setQueryData(keyOf(wallet), { confirmed: [] });
        }

        await act(async () => {
            await result.current.mutateAsync(broadcasted([OWN_RECEIVER, EXTERNAL]));
        });

        expect(queryClient.getQueryState(keyOf(sender))?.isInvalidated).toBe(true);
        expect(queryClient.getQueryState(keyOf(ownReceiver))?.isInvalidated).toBe(true);
        expect(queryClient.getQueryState(keyOf(unrelated))?.isInvalidated).toBe(false);
    });
});
