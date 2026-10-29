import { useNavigation } from '@react-navigation/core';
import { useCallback } from 'react';
import { useUnistyles } from 'react-native-unistyles';

import { assertUnreachable, BTC_ASSET } from '@safely/core';
import type { BtcHistoryItem } from '@safely/ux';
import {
    useActiveBtcRatedAmount,
    useActivePortfolio,
    useActivePortfolioWalletsOrNull,
    useActivePortfolioNetworkBadge,
    useBtcReceiveInfo
} from '@safely/ux';

import { AssetHistoryHeader, AssetHistoryScreen, BtcHistoryList } from '@mobile/features/history';
import { HomeActions } from '@mobile/features/home';

const BtcContent = () => {
    const navigation = useNavigation();
    const portfolio = useActivePortfolio();
    const { theme } = useUnistyles();
    const networkBadge = useActivePortfolioNetworkBadge();
    const { displayAddress } = useBtcReceiveInfo();
    const { data: ratedAmount } = useActiveBtcRatedAmount();

    const onNavigateToActivityItem = useCallback(
        (activity: BtcHistoryItem) => {
            switch (activity.type) {
                case 'order':
                    navigation.navigate('OrderScreen', { order: activity });
                    break;
                case 'transaction':
                    navigation.navigate('BtcTransactionScreen', { activity });
                    break;
                default:
                    assertUnreachable(activity);
            }
        },
        [navigation]
    );

    return (
        <>
            <AssetHistoryHeader
                gradientColor={theme.colors.brand.bitcoin}
                asset={BTC_ASSET}
                networkBadge={networkBadge}
                address={displayAddress}
                ratedAmount={ratedAmount}
                actions={<HomeActions />}
            />
            <BtcHistoryList
                key={portfolio?.id.toString()}
                onNavigateToActivityItem={onNavigateToActivityItem}
            />
        </>
    );
};

export const BtcScreen = () => (
    <AssetHistoryScreen hasChain={Boolean(useActivePortfolioWalletsOrNull()?.btc)}>
        <BtcContent />
    </AssetHistoryScreen>
);
