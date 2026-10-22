import { useNavigation } from '@react-navigation/core';
import { StackActions } from '@react-navigation/native';
import { useCallback, useEffect } from 'react';
import { useUnistyles } from 'react-native-unistyles';

import type { FlameActivityItem } from '@safely/core';
import { FLAME_ASSET } from '@safely/core';
import {
    useActiveFlameRatedAmount,
    useActiveFlameWallet,
    useActivePortfolioWalletsOrNull,
    useActivePortfolioNetworkBadge,
    useNumberFormatter
} from '@safely/ux';

import { AssetHistoryHeader, FlameHistoryList } from '@mobile/features/history';
import { HomeActions } from '@mobile/features/home';
import { Screen } from '@mobile/shared/ui';

const FlameContent = () => {
    const navigation = useNavigation();
    const { theme } = useUnistyles();
    const formatter = useNumberFormatter();
    const networkBadge = useActivePortfolioNetworkBadge();
    const { address } = useActiveFlameWallet();
    const { data: ratedAmount } = useActiveFlameRatedAmount();

    const onNavigateToActivityItem = useCallback(
        (activity: FlameActivityItem) => {
            navigation.navigate('FlameTransactionScreen', { activity });
        },
        [navigation]
    );

    const price = ratedAmount?.price;
    const fiatAmount = price ? ratedAmount.amount.convert(price).format(formatter) : undefined;

    return (
        <>
            <AssetHistoryHeader
                gradientColor={theme.colors.brand.flame}
                symbol={FLAME_ASSET.symbol}
                networkBadge={networkBadge}
                address={address}
                amount={ratedAmount?.amount.format(formatter, { currencyDisplay: 'none' })}
                fiatAmount={fiatAmount}
                actions={<HomeActions />}
            />
            <FlameHistoryList onNavigateToActivityItem={onNavigateToActivityItem} />
        </>
    );
};

export const FlameScreen = () => {
    const navigation = useNavigation();
    const hasFlame = Boolean(useActivePortfolioWalletsOrNull()?.flame);

    useEffect(() => {
        if (!hasFlame) {
            navigation.dispatch(StackActions.popToTop());
        }
    }, [hasFlame, navigation]);

    return <Screen>{hasFlame && <FlameContent />}</Screen>;
};
