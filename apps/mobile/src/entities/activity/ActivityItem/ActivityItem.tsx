import { memo } from 'react';
import { View } from 'react-native';

import { SPACE } from '@safely/core';
import type { ContactMeta, PortfolioMeta } from '@safely/core';
import { useTransactionHistoryAmountOrder } from '@safely/ux';

import { ContactName } from '@mobile/entities/contact';
import { PortfolioName } from '@mobile/entities/portfolio';
import { Cell, Text } from '@mobile/shared/ui';

import { styles } from './ActivityItem.styles';

export type ActivityItemCounterparty =
    | { kind: 'contact'; meta: ContactMeta }
    | { kind: 'portfolio'; meta: PortfolioMeta }
    | { kind: 'address'; label: string }
    | { kind: 'provider'; label: string };

export type ActivityItemProps = {
    title: string;
    amountSign: '+' | '−' | null;
    formattedValue: string;
    valueColor: 'primary' | 'accentGreen' | 'tertiary';
    formattedFiat: string | null;
    timestampLabel: string | null;
    background: 'tertiary' | 'secondary';
    counterparty: ActivityItemCounterparty;
    note?: string | null;
    onPress?: () => void;
};

const Counterparty = ({ counterparty }: { counterparty: ActivityItemCounterparty }) => {
    switch (counterparty.kind) {
        case 'contact':
            return (
                <ContactName
                    meta={counterparty.meta}
                    size={12}
                    gap={6}
                    fontVariant="bodyM"
                    color="secondary"
                />
            );
        case 'portfolio':
            return (
                <PortfolioName
                    meta={counterparty.meta}
                    size={12}
                    gap={6}
                    fontVariant="bodyM"
                    color="secondary"
                />
            );
        case 'address':
            return <Cell.Subtitle color="secondary">{counterparty.label}</Cell.Subtitle>;
        case 'provider':
            return (
                <Cell.Subtitle textTransform="capitalize" color="secondary">
                    {counterparty.label}
                </Cell.Subtitle>
            );
    }
};

export const ActivityItem = memo((props: ActivityItemProps) => {
    const {
        title,
        amountSign,
        formattedValue,
        valueColor,
        formattedFiat,
        timestampLabel,
        background,
        counterparty,
        note,
        onPress
    } = props;
    const amountOrder = useTransactionHistoryAmountOrder();

    const [primaryAmount, secondaryAmount] =
        amountOrder === 'fiat' && formattedFiat !== null
            ? [formattedFiat, formattedValue]
            : [formattedValue, formattedFiat];

    return (
        <Cell
            containerStyle={styles.border}
            background={background}
            showDivider={false}
            onPress={onPress}
        >
            <Cell.Content>
                <Cell.Row>
                    <View style={styles.titleWithTimestamp}>
                        <Cell.Title>{title}</Cell.Title>
                        {timestampLabel !== null && (
                            <Text color="tertiary" style={styles.timestamp}>
                                {timestampLabel}
                            </Text>
                        )}
                    </View>
                    <Cell.Value color={valueColor}>
                        {amountSign !== null && `${amountSign}${SPACE.THSP}`}
                        {primaryAmount}
                    </Cell.Value>
                </Cell.Row>
                <Cell.Row>
                    <Counterparty counterparty={counterparty} />
                    <Cell.Subvalue>{secondaryAmount}</Cell.Subvalue>
                </Cell.Row>
                {!!note && (
                    <Cell.Row>
                        <Cell.Subtitle numberOfLines={2}>{note}</Cell.Subtitle>
                    </Cell.Row>
                )}
            </Cell.Content>
        </Cell>
    );
});

export const ActivityItemSkeleton = () => {
    return (
        <Cell skeleton showDivider={false}>
            <Cell.Content>
                <Cell.Row>
                    <Cell.Title skeleton />
                    <Cell.Value skeleton />
                </Cell.Row>
                <Cell.Row>
                    <Cell.Subtitle skeleton />
                    <Cell.Subvalue skeleton />
                </Cell.Row>
            </Cell.Content>
        </Cell>
    );
};
