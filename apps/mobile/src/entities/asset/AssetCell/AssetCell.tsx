import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type ViewStyle } from 'react-native';

import type { CryptoAssetAmount, CryptoFiatRate, NumberFormatter } from '@safely/core';
import {
    orderAmounts,
    useDisplayedHomeScreenAmountOrder,
    useActivePortfolioNetworkBadge,
    useNumberFormatter
} from '@safely/ux';

import { NetworkBadge } from '@mobile/entities/portfolio';
import { Cell, ChevronRight12, Icon } from '@mobile/shared/ui';

import { styles } from './AssetCell.styles';

type AssetCellImage = ComponentProps<typeof Cell.Image>;

export type AssetCellProps = {
    cryptoAssetAmount: CryptoAssetAmount;
    price: CryptoFiatRate | null | undefined;
    image: AssetCellImage;
    footer?: ReactNode;
    showDivider?: boolean;
    style?: ViewStyle;
    background?: 'tertiary' | 'secondary';
    onPress?: () => void;
};

function formatFiatAmount(
    amount: CryptoAssetAmount,
    price: CryptoFiatRate | null | undefined,
    formatter: NumberFormatter
): string | null {
    if (price === null) return null;

    return price ? amount.convert(price).format(formatter) : '–';
}

export const AssetCell = (props: AssetCellProps) => {
    const {
        cryptoAssetAmount,
        price,
        image,
        footer,
        showDivider = true,
        style,
        background,
        onPress
    } = props;

    const { t } = useTranslation();
    const formatter = useNumberFormatter();
    const amountOrder = useDisplayedHomeScreenAmountOrder(price);
    const networkBadge = useActivePortfolioNetworkBadge();

    const fiatAmount = formatFiatAmount(cryptoAssetAmount, price, formatter);
    const cryptoAmount = cryptoAssetAmount.format(formatter, { fullPrecision: true });

    const [primaryAmount, secondaryAmount] = orderAmounts(amountOrder, cryptoAmount, fiatAmount);

    return (
        <Cell
            showDivider={showDivider}
            onPress={onPress}
            background={background}
            style={[styles.cell as ViewStyle, style]}
        >
            <Cell.Image {...image} containerStyle={styles.image} />
            <Cell.Content>
                <Cell.Row style={styles.titleRow}>
                    <View style={styles.title}>
                        <Cell.Title color="primary">{cryptoAssetAmount.asset.name}</Cell.Title>
                        {networkBadge && <NetworkBadge badge={networkBadge} />}
                    </View>
                    <Cell.Value color="primary">{primaryAmount}</Cell.Value>
                </Cell.Row>
                <Cell.Row style={styles.subtitleRow}>
                    <View style={styles.subtitleContainer}>
                        <Cell.Subtitle color="secondary">{t('assetCell.history')}</Cell.Subtitle>
                        <Icon style={styles.chevron} icon={ChevronRight12} color="tertiary" />
                    </View>
                    {secondaryAmount !== null && (
                        <Cell.Subvalue color="secondary" style={styles.subvalue}>
                            {secondaryAmount}
                        </Cell.Subvalue>
                    )}
                </Cell.Row>
                {footer && <Cell.Row>{footer}</Cell.Row>}
            </Cell.Content>
        </Cell>
    );
};
