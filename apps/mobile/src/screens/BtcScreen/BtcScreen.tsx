import { useNavigation } from '@react-navigation/core';
import { useCallback } from 'react';
import { useUnistyles } from 'react-native-unistyles';

import { assertUnreachable, BTC_ASSET } from '@safely/core';
import type { ActivityItem } from '@safely/ux';
import {
    useActiveBtcRatedAmount,
    useActivePortfolio,
    useHasPortfolio,
    useIsActivePortfolioTestnet,
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
    const isTestnet = useIsActivePortfolioTestnet();
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
                isTestnet={isTestnet}
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
    const hasPortfolio = useHasPortfolio();

    return <Screen>{hasPortfolio && <HistoryContent />}</Screen>;
};
