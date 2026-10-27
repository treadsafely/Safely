import { View } from 'react-native';

import type { CryptoAsset, Recipient } from '@safely/core';
import { BLOCKCHAIN_NAME, BTC_ASSET, FLAME_ASSET } from '@safely/core';
import {
    useActivePortfolioWallets,
    useNumberFormatter,
    usePortfolioAssets,
    usePortfolioBalanceUnit,
    usePortfolioTotalBalance
} from '@safely/ux';

import { Text } from '@mobile/shared/ui';

import { Subtitle } from './components';
import { styles } from './TotalBalance.styles';

const ASSET_BY_CHAIN: Record<Recipient['blockchain'], CryptoAsset> = {
    [BLOCKCHAIN_NAME.BTC]: BTC_ASSET,
    [BLOCKCHAIN_NAME.FLAME]: FLAME_ASSET
};

export const TotalBalance = () => {
    const wallets = useActivePortfolioWallets();
    const totalBalance = usePortfolioTotalBalance(wallets);
    const formatter = useNumberFormatter();
    const primaryAsset = usePortfolioAssets(wallets)[0];
    const mainBalanceUnit = usePortfolioBalanceUnit(wallets);

    return (
        <View style={styles.container}>
            {mainBalanceUnit === 'crypto' ? (
                <View style={styles.cryptoAmount}>
                    <Text variant="displayL" skeleton>
                        {primaryAsset?.rated?.amount.format(formatter, {
                            currencyDisplay: 'none'
                        })}
                    </Text>
                    <Text variant="bodyL" color="tertiary">
                        {primaryAsset && ASSET_BY_CHAIN[primaryAsset.blockchain].symbol}
                    </Text>
                </View>
            ) : (
                <Text textAlign="center" variant="displayL" skeleton>
                    {totalBalance.data?.format(formatter)}
                </Text>
            )}
            <Subtitle />
        </View>
    );
};
