import { useNavigation } from '@react-navigation/core';
import { StackActions } from '@react-navigation/native';
import { useCallback, useEffect } from 'react';
import { useUnistyles } from 'react-native-unistyles';

import { assertUnreachable, BTC_ASSET } from '@safely/core';
import type { ActivityItem } from '@safely/ux';
import {
    useActiveBtcRatedAmount,
    useActivePortfolio,
    useActivePortfolioWalletsOrNull,
    useActivePortfolioNetworkBadge,
    useNumberFormatter,
    useReceiveInfo
} from '@safely/ux';

import { AssetHistoryHeader, HistoryList } from '@mobile/features/history';
import { HomeActions } from '@mobile/features/home';
import { Screen } from '@mobile/shared/ui';

const HistoryContent = () => {
    const navigation = useNavigation();
    const portfolio = useActivePortfolio();
    const { theme } = useUnistyles();
    const formatter = useNumberFormatter();
    const networkBadge = useActivePortfolioNetworkBadge();
    const { displayAddress } = useReceiveInfo();
    const { data: btc } = useActiveBtcRatedAmount();

    const onNavigateToActivityItem = useCallback(
        (activity: ActivityItem) => {
            switch (activity.type) {
                case 'order':
                    navigation.navigate('OrderScreen', { order: activity });
                    break;
                case 'transaction':
                    navigation.navigate('TransactionScreen', { activity });
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
                symbol={BTC_ASSET.symbol}
                networkBadge={networkBadge}
                address={displayAddress}
                amount={btc?.amount.format(formatter, { currencyDisplay: 'none' })}
                fiatAmount={
                    btc?.price ? btc.amount.convert(btc.price).format(formatter) : undefined
                }
                actions={<HomeActions />}
            />
            <HistoryList
                key={portfolio?.id.toString()}
                onNavigateToActivityItem={onNavigateToActivityItem}
            />
        </>
    );
};

export const BtcScreen = () => {
    const navigation = useNavigation();
    const hasBtc = Boolean(useActivePortfolioWalletsOrNull()?.btc);

    useEffect(() => {
        if (!hasBtc) {
            navigation.dispatch(StackActions.popToTop());
        }
    }, [hasBtc, navigation]);

    return <Screen>{hasBtc && <HistoryContent />}</Screen>;
};
