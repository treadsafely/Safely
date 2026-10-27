import { useNavigation } from '@react-navigation/core';
import { useCallback } from 'react';
import { useUnistyles } from 'react-native-unistyles';

import type { FlameHistoryItem } from '@safely/core';
import { FLAME_ASSET } from '@safely/core';
import {
    useActiveFlameRatedAmount,
    useActivePortfolio,
    useActivePortfolioWalletsOrNull,
    useActivePortfolioNetworkBadge,
    useFlameReceiveInfo
} from '@safely/ux';

import { AssetHistoryHeader, AssetHistoryScreen, FlameHistoryList } from '@mobile/features/history';
import { HomeActions } from '@mobile/features/home';

const FlameContent = () => {
    const navigation = useNavigation();
    const portfolio = useActivePortfolio();
    const { theme } = useUnistyles();
    const networkBadge = useActivePortfolioNetworkBadge();
    const { displayAddress } = useFlameReceiveInfo();
    const { data: ratedAmount } = useActiveFlameRatedAmount();

    const onNavigateToActivityItem = useCallback(
        (activity: FlameHistoryItem) => {
            navigation.navigate('FlameTransactionScreen', { activity });
        },
        [navigation]
    );

    return (
        <>
            <AssetHistoryHeader
                gradientColor={theme.colors.brand.flame}
                asset={FLAME_ASSET}
                networkBadge={networkBadge}
                address={displayAddress}
                ratedAmount={ratedAmount}
                actions={<HomeActions />}
            />
            <FlameHistoryList
                key={portfolio?.id.toString()}
                onNavigateToActivityItem={onNavigateToActivityItem}
            />
        </>
    );
};

export const FlameScreen = () => (
    <AssetHistoryScreen hasChain={Boolean(useActivePortfolioWalletsOrNull()?.flame)}>
        <FlameContent />
    </AssetHistoryScreen>
);
