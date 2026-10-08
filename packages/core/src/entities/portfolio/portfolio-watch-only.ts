import type { SPortfolioMeta, SPortfolioWatchOnlyId } from '@safely/sync-storage';
import { type SPortfolioWatchOnly, sPortfolioWatchOnly } from '@safely/sync-storage';

import { WatchOnlySource } from './I-portfolio';
import type { PortfolioIdWatchOnly } from './portfolio-id-watch-only';
import { toPortfolioIdWatchOnly } from './portfolio-id-watch-only';
import type { PortfolioMeta } from './portfolio-meta';
import type { PortfolioNetworkType } from './portfolio-network-type';
import { PortfolioWatchOnlyBase } from './portfolio-watch-only-base';
import { BtcXpub } from '../../blockchain-api';
import { btcNetworkByPortfolioNetworkType, BtcWalletType, VM_TYPE } from '../blockchain';
import { BtcWalletId } from '../derivation/btc/btc-wallet-id';
import type { BtcWalletReadOnly } from '../derivation/btc/I-btc-wallet';

export class PortfolioWatchOnlyBtc extends PortfolioWatchOnlyBase {
    public static resolveUserInput(
        input: string,
        networkType: PortfolioNetworkType
    ): SPortfolioWatchOnlyId {
        const source = BtcXpub.validate(input) ? WatchOnlySource.XPUB : WatchOnlySource.ADDRESS;
        if (source === WatchOnlySource.XPUB) {
            return { source, xpub: input, networkType };
        } else {
            return { source, address: input, networkType };
        }
    }

    public static deriveAddress(xpub: string, networkType: PortfolioNetworkType): string {
        return BtcXpub.deriveAddress(
            xpub,
            btcNetworkByPortfolioNetworkType(networkType),
            BtcWalletType.NATIVE_SEGWIT
        );
    }

    public static create(id: SPortfolioWatchOnlyId, meta: SPortfolioMeta): PortfolioWatchOnlyBtc {
        const portfolioId = toPortfolioIdWatchOnly(id);
        const network = btcNetworkByPortfolioNetworkType(portfolioId.network);

        let xpub: string | null;
        let address: string;
        if (portfolioId.source === WatchOnlySource.XPUB) {
            xpub = portfolioId.xpub;
            address = this.deriveAddress(portfolioId.xpub, portfolioId.network);
        } else {
            address = portfolioId.address;
            xpub = null;
        }

        const wallet: BtcWalletReadOnly = {
            id: new BtcWalletId(portfolioId.toString(), address),
            type: BtcWalletType.NATIVE_SEGWIT,
            address,
            network,
            xpub
        };

        return new PortfolioWatchOnlyBtc({
            id: portfolioId,
            meta,
            wallet
        });
    }

    public static restore(sPortfolio: SPortfolioWatchOnly): PortfolioWatchOnlyBtc {
        return this.create(sPortfolio.id, sPortfolio.meta);
    }

    public readonly vmType = VM_TYPE.BTC;

    public override readonly id: PortfolioIdWatchOnly;

    public readonly wallet: BtcWalletReadOnly;

    public get networkType(): PortfolioNetworkType {
        return this.id.network;
    }

    constructor(params: {
        id: PortfolioIdWatchOnly;
        meta: PortfolioMeta;
        wallet: BtcWalletReadOnly;
    }) {
        super({
            id: params.id,
            meta: params.meta
        });
        this.id = params.id;
        this.wallet = params.wallet;
    }

    public toJSON(): SPortfolioWatchOnly {
        return sPortfolioWatchOnly.toJson({
            id: this.id.toJSON(),
            type: this.type,
            meta: this.meta
        });
    }

    public jsonArrayId(): string {
        return sPortfolioWatchOnly.jsonArrayId(this.toJSON());
    }
}

export type PortfolioWatchOnly = PortfolioWatchOnlyBtc;
