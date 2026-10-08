import { useNavigation } from '@react-navigation/core';
import { StackActions } from '@react-navigation/native';
import { useEffect } from 'react';
import { useUnistyles } from 'react-native-unistyles';

import { FLAME_ASSET } from '@safely/core';
import {
    useActiveFlameSource,
    useFlameRatedAmount,
    useHasPortfolio,
    useIsActivePortfolioTestnet,
    useNumberFormatter
} from '@safely/ux';

import { FlameActions } from '@mobile/features/flame';
import { AssetHistoryHeader, FlameHistoryList } from '@mobile/features/history';
import { Screen } from '@mobile/shared/ui';

const FlameContent = () => {
    const navigation = useNavigation();
    const { theme } = useUnistyles();
    const formatter = useNumberFormatter();
    const isTestnet = useIsActivePortfolioTestnet();
    const source = useActiveFlameSource();
    const { data: ratedAmount } = useFlameRatedAmount(source);

    const hasFlame = source !== null;

    useEffect(() => {
        if (!hasFlame) {
            navigation.dispatch(StackActions.popToTop());
        }
    }, [hasFlame, navigation]);

    const price = ratedAmount?.price;
    const fiatAmount = price ? ratedAmount.amount.convert(price).format(formatter) : undefined;

    return (
        <>
            <AssetHistoryHeader
                gradientColor={theme.colors.brand.flame}
                symbol={FLAME_ASSET.symbol}
                isTestnet={isTestnet}
                address={source?.chain.wallet.address}
                amount={ratedAmount?.amount.format(formatter, { currencyDisplay: 'none' })}
                fiatAmount={fiatAmount}
                actions={<FlameActions />}
            />
            <FlameHistoryList />
        </>
    );
};

export const FlameScreen = () => {
    const hasPortfolio = useHasPortfolio();

    return <Screen>{hasPortfolio && <FlameContent />}</Screen>;
};
