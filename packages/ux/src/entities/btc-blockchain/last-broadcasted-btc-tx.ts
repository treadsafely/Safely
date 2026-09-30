import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import type { BtcApiUtxo, BtcTransactionTemplate, BtcWallet, CryptoFiatRate } from '@safely/core';
import { BtcAssetAmount, toBig, toBigOrZero } from '@safely/core';
import type { BtcApiTx, BtcApiUtxoWithOptionalTx } from '@safely/core/api/btc';

import { useActiveAccount } from '../account';
import { getBiggestBtcIOAddress } from '../activity/api';
import type { BtcActivityItem } from '../activity/types';
import { useActiveBtcWallet } from '../portfolio';
import { utxo } from './keys';
import { refetchQueries } from '../../shared';

const lastBroadcastedBtcTxStore = createStore<Record<string, BroadcastedBtcTx>>(() => ({}));

function selectLastBroadcastedBtcTxForWallet(
    tx: BroadcastedBtcTx | undefined,
    wallet: BtcWallet
): BroadcastedBtcTx | null {
    if (!tx) return null;
    if (tx.senderXpub === wallet.xpub || tx.outputs.some(o => o.address === wallet.address)) {
        return tx;
    }
    return null;
}

export function useLastBroadcastedBtcTx(): BroadcastedBtcTx | undefined {
    const account = useActiveAccount();
    const wallet = useActiveBtcWallet();
    return useStore(lastBroadcastedBtcTxStore, caches => {
        return selectLastBroadcastedBtcTxForWallet(caches[account.accountId], wallet) ?? undefined;
    });
}

export function getLastBroadcastedBtcTxForWallet(
    accountId: string,
    wallet: BtcWallet
): BroadcastedBtcTx | null {
    return selectLastBroadcastedBtcTxForWallet(
        lastBroadcastedBtcTxStore.getState()[accountId],
        wallet
    );
}

export function useSetLastBroadcastedBtcTx() {
    const account = useActiveAccount();
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(tx: BroadcastedBtcTx) {
            const accountId = account.accountId;
            lastBroadcastedBtcTxStore.setState(s => ({ ...s, [accountId]: tx }));

            void queryClient.invalidateQueries({ queryKey: utxo.toKey() });
            void refetchQueries(queryClient, utxo.toKey());

            setTimeout(() => {
                if (lastBroadcastedBtcTxStore.getState()[accountId]?.txId === tx.txId) {
                    lastBroadcastedBtcTxStore.setState(s => {
                        const { [accountId]: _, ...rest } = s;
                        return rest;
                    }, true);
                }
            }, 20_000);
        }
    });
}

export class BroadcastedBtcTx {
    public static fromTransactionTemplate(template: BtcTransactionTemplate) {
        if (!template.sendResult) {
            throw new Error('Transaction is not published');
        }

        return new BroadcastedBtcTx(
            template.sendResult.txId,
            Date.now(),
            template.inputs.map(u => ({
                txid: u.txid,
                vout: u.vout,
                value: u.value,
                address: u.address!
            })),
            template.outputs.map(o => ({ address: o.address, value: o.value.toString() })),
            template.estimation.fee.amount.weiAmount.toString(),
            template.wallet.xpub
        );
    }

    private constructor(
        public readonly txId: string,
        public readonly timestamp: number,
        public readonly inputs: { txid: string; vout: number; value: string; address: string }[],
        public readonly outputs: { address: string; value: string }[],
        public readonly fee: string,
        public readonly senderXpub: string
    ) {}

    public toBtcApiTx(walletAddress: string): BtcApiTx {
        return {
            txid: this.txId,
            vin: this.inputs.map(u => ({
                txid: u.txid,
                vout: u.vout,
                addresses: [u.address],
                value: u.value,
                isOwn: u.address === walletAddress
            })),
            vout: this.outputs.map(o => ({
                value: o.value,
                addresses: [o.address],
                isOwn: o.address === walletAddress
            })),
            blockHeight: -1,
            confirmations: 0,
            blockTime: this.timestamp,
            confirmationETABlocks: 1
        };
    }

    public toActivityItem(
        walletAddress: string,
        rate: CryptoFiatRate | null
    ): BtcActivityItem | null {
        const btcApiTx = this.toBtcApiTx(walletAddress);

        const isInitiator = !!btcApiTx.vin?.some(input => input.isOwn);

        const fromAddress = getBiggestBtcIOAddress(
            btcApiTx.vin.filter(v => Boolean(v.isOwn) === isInitiator)
        );
        const toAddress =
            getBiggestBtcIOAddress(btcApiTx.vout.filter(v => Boolean(v.isOwn) === !isInitiator)) ??
            getBiggestBtcIOAddress(btcApiTx.vout);

        if (!fromAddress || !toAddress) {
            return null;
        }

        const weiAmount = btcApiTx.vout
            .filter(v => Boolean(v.isOwn) === !isInitiator)
            .reduce((acc, v) => acc.plus(toBigOrZero(v.value)), toBig(0));

        return {
            type: 'transaction',
            timestamp: this.timestamp,
            key: btcApiTx.txid,
            transaction: {
                isInitiator,
                fromAddress,
                toAddress,
                value: BtcAssetAmount.fromWeiAmount(weiAmount),
                fee: this.fee
                    ? { type: 'crypto', amount: BtcAssetAmount.fromWeiAmount(this.fee) }
                    : undefined,
                rate,
                raw: btcApiTx
            }
        };
    }
}

export class BroadcastedBtcTxService {
    private readonly serverConfirmed: BtcApiUtxo[];
    private readonly serverSafe: BtcApiUtxoWithOptionalTx[];
    private readonly serverUnsafe: BtcApiUtxoWithOptionalTx[];

    constructor(
        private readonly lastBroadcastedTx: BroadcastedBtcTx | null,
        private readonly walletAddress: string,
        utxos: {
            serverConfirmed: BtcApiUtxo[];
            serverSafe: BtcApiUtxoWithOptionalTx[];
            serverUnsafe: BtcApiUtxoWithOptionalTx[];
        }
    ) {
        this.serverConfirmed = utxos.serverConfirmed;
        this.serverSafe = utxos.serverSafe;
        this.serverUnsafe = utxos.serverUnsafe;
    }

    public get hasLocalNotBroadcastedCache(): boolean {
        if (!this.lastBroadcastedTx) {
            return false;
        }

        return !this.isLastBroadcastedTxVisibleOnServer;
    }

    private get isLastBroadcastedTxVisibleOnServer(): boolean {
        if (!this.lastBroadcastedTx) return false;
        const txId = this.lastBroadcastedTx.txId;
        return (
            this.serverConfirmed.some(u => u.txid === txId) ||
            this.serverSafe.some(u => u.txid === txId) ||
            this.serverUnsafe.some(u => u.txid === txId)
        );
    }

    public get confirmed(): BtcApiUtxo[] {
        if (!this.lastBroadcastedTx || this.isLastBroadcastedTxVisibleOnServer)
            return this.serverConfirmed;

        const spentKeys = new Set(this.lastBroadcastedTx.inputs.map(i => `${i.txid}:${i.vout}`));
        return this.serverConfirmed.filter(u => !spentKeys.has(`${u.txid}:${u.vout}`));
    }

    public get unconfirmedSafe(): BtcApiUtxoWithOptionalTx[] {
        if (!this.lastBroadcastedTx || this.isLastBroadcastedTxVisibleOnServer)
            return this.serverSafe;

        const spentKeys = new Set(this.lastBroadcastedTx.inputs.map(i => `${i.txid}:${i.vout}`));
        const filteredSafe = this.serverSafe.filter(u => !spentKeys.has(`${u.txid}:${u.vout}`));

        const existingKeys = new Set([
            ...this.serverConfirmed.map(u => `${u.txid}:${u.vout}`),
            ...filteredSafe.map(u => `${u.txid}:${u.vout}`),
            ...this.serverUnsafe.map(u => `${u.txid}:${u.vout}`)
        ]);

        const btcApiTx = this.lastBroadcastedTx.toBtcApiTx(this.walletAddress);
        const newUtxos: BtcApiUtxoWithOptionalTx[] = [];

        this.lastBroadcastedTx.outputs.forEach((output, vout) => {
            if (output.address !== this.walletAddress) return;

            const key = `${this.lastBroadcastedTx!.txId}:${vout}`;
            if (existingKeys.has(key)) return;

            existingKeys.add(key);
            newUtxos.push({
                txid: this.lastBroadcastedTx!.txId,
                vout,
                value: output.value,
                confirmations: 0,
                address: output.address,
                tx: btcApiTx
            });
        });

        return [...filteredSafe, ...newUtxos];
    }
}
