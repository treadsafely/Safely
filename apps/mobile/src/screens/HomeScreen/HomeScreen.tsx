import { useScrollToTop } from '@react-navigation/native';
import { useRef } from 'react';
import type { ScrollView } from 'react-native';

import { useActivePortfolioWallets, useHasPortfolio, useTrackWalletOpen } from '@safely/ux';

import { Chart } from '@mobile/features/chart';
import { AssetsList, HomeActions, HomeHeader, TotalBalance } from '@mobile/features/home';
import { Banners } from '@mobile/features/notices';
import { Screen } from '@mobile/shared/ui';

import { HomeEmptyState } from './components';

export const HomeScreen = () => {
    const hasPortfolio = useHasPortfolio();

    return (
        <Screen>
            <HomeHeader />
            {hasPortfolio ? <HomeContent /> : <HomeEmptyState />}
        </Screen>
    );
};

function HomeContent() {
    const scrollRef = useRef<ScrollView>(null);
    const wallets = useActivePortfolioWallets();

    useScrollToTop(scrollRef);
    useTrackWalletOpen();

    return (
        <Screen.Scrollable ref={scrollRef}>
            <Banners />
            <TotalBalance />
            <HomeActions />
            <AssetsList />
            {wallets.btc && <Chart />}
        </Screen.Scrollable>
    );
}
