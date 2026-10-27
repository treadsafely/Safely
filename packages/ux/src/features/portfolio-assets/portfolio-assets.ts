import { useMemo } from 'react';

import type { FiatAssetAmount, RatedCryptoAssetAmount, Recipient } from '@safely/core';
import { BLOCKCHAIN_NAME } from '@safely/core';

import type { PortfolioWallets } from '../../entities';
import {
    calculateTotalBalance,
    useActiveFiat,
    useBtcRatedAmount,
    useFlameRatedAmount
} from '../../entities';
import type { DerivedQueryResult } from '../../shared';
import { useDerivedQuery } from '../../shared';
import type { AmountUnit } from '../amount-display';
import { useDisplayedMainBalanceUnit } from '../amount-display';

export type PortfolioAddress = {
    blockchain: Recipient['blockchain'];
    address: string;
};

export type PortfolioAsset = PortfolioAddress & {
    rated: RatedCryptoAssetAmount | null | undefined;
};

export function resolvePortfolioAddresses(wallets: PortfolioWallets): PortfolioAddress[] {
    const addresses: PortfolioAddress[] = [];

    if (wallets.btc) {
        addresses.push({ blockchain: BLOCKCHAIN_NAME.BTC, address: wallets.btc.address });
    }

    if (wallets.flame) {
        addresses.push({
            blockchain: BLOCKCHAIN_NAME.FLAME,
            address: wallets.flame.receivingAddress
        });
    }

    return addresses;
}

export function usePortfolioAssets(wallets: PortfolioWallets): PortfolioAsset[] {
    const { data: btc } = useBtcRatedAmount(wallets.btc);
    const { data: flame } = useFlameRatedAmount(wallets.flame);

    return useMemo(() => {
        const ratedByChain = { [BLOCKCHAIN_NAME.BTC]: btc, [BLOCKCHAIN_NAME.FLAME]: flame };

        return resolvePortfolioAddresses(wallets).map(address => ({
            ...address,
            rated: ratedByChain[address.blockchain]
        }));
    }, [wallets, btc, flame]);
}

export function usePortfolioBalanceUnit(wallets: PortfolioWallets): AmountUnit {
    const primaryAsset = usePortfolioAssets(wallets)[0];

    return useDisplayedMainBalanceUnit(primaryAsset?.rated?.price);
}

type RatedChainQuery = DerivedQueryResult<RatedCryptoAssetAmount | null>;

const asSettled = (query: RatedChainQuery): RatedChainQuery => ({
    ...query,
    data: query.data ?? null,
    isError: false,
    isSuccess: true,
    isPending: false,
    error: null
});

export function isolateChainFailures(queries: RatedChainQuery[]): RatedChainQuery[] {
    // an absent chain settles as `null`, so a pending chain (`undefined`) still counts as healthy
    const hasHealthyChain = queries.some(query => !query.isError && query.data !== null);
    if (!hasHealthyChain) return queries;

    return queries.map(query => (query.isError ? asSettled(query) : query));
}

export function usePortfolioTotalBalance(
    wallets: PortfolioWallets
): DerivedQueryResult<FiatAssetAmount | null> {
    const btcQuery = useBtcRatedAmount(wallets.btc);
    const flameQuery = useFlameRatedAmount(wallets.flame);
    const fiat = useActiveFiat();
    const queries = useMemo(
        () => isolateChainFailures([btcQuery, flameQuery]),
        [btcQuery, flameQuery]
    );

    return useDerivedQuery({
        queries,
        queryFn: ratedAmounts =>
            calculateTotalBalance(
                ratedAmounts.filter(rated => rated !== null),
                fiat
            )
    });
}
