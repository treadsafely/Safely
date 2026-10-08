import type { FC } from 'react';
import { memo } from 'react';

import { SPACE } from '@safely/core';
import type { ActivityCounterparty, ActivityRowView } from '@safely/ux';
import { useTransactionHistoryAmountOrder } from '@safely/ux';
import Human16 from '@safely/ux/assets/icons/16/human-16.svg?react';

import {
    amountStyles,
    contactIconStyles,
    counterpartyStyles,
    pendingStyles,
    providerStyles,
    timestampStyles,
    titleRowStyles
} from './ActivityItem.styles';
import type { CellTone } from '../../shared';
import { Cell, Icon, Skeleton, Text } from '../../shared';
import { toContactColorStyle } from '../contact';
import { WalletIcon } from '../portfolio';

export type ActivityItemProps = Omit<ActivityRowView, 'key' | 'activity'> & {
    tone?: CellTone;
    isSelected?: boolean;
    onSelect?: () => void;
};

const Counterparty: FC<{ counterparty: ActivityCounterparty }> = ({ counterparty }) => {
    switch (counterparty.kind) {
        case 'contact':
            return (
                <span className={counterpartyStyles}>
                    <Icon
                        asset={Human16}
                        tone="inherit"
                        size={12}
                        className={contactIconStyles}
                        style={toContactColorStyle(counterparty.meta.color)}
                    />
                    <Text variant="bodyM" tone="secondary" isTruncated>
                        {counterparty.meta.name}
                    </Text>
                </span>
            );
        case 'portfolio':
            return (
                <span className={counterpartyStyles}>
                    <WalletIcon icon={counterparty.meta.icon} />
                    <Text variant="bodyM" tone="secondary" isTruncated>
                        {counterparty.meta.name}
                    </Text>
                </span>
            );
        case 'address':
            return (
                <Text variant="bodyM" tone="secondary" isTruncated>
                    {counterparty.label}
                </Text>
            );
        case 'provider':
            return (
                <Text variant="bodyM" tone="secondary" isTruncated className={providerStyles}>
                    {counterparty.label}
                </Text>
            );
    }
};

export const ActivityItem: FC<ActivityItemProps> = memo(props => {
    const {
        title,
        amountSign,
        formattedValue,
        valueTone,
        formattedFiat,
        timestampLabel,
        isPending,
        counterparty,
        tone,
        isSelected,
        onSelect
    } = props;

    const amountOrder = useTransactionHistoryAmountOrder();

    const [primaryAmount, secondaryAmount] =
        amountOrder === 'fiat' && formattedFiat !== null
            ? [formattedFiat, formattedValue]
            : [formattedValue, formattedFiat];

    return (
        <Cell
            className={isPending ? pendingStyles : undefined}
            tone={tone}
            isSelected={isSelected}
            onClick={onSelect}
        >
            <Cell.Content>
                <Cell.Row>
                    <span className={titleRowStyles}>
                        <Cell.Title>{title}</Cell.Title>
                        {timestampLabel !== null && (
                            <Text tone="tertiary" className={timestampStyles}>
                                {timestampLabel}
                            </Text>
                        )}
                    </span>
                    <Text variant="labelL" tone={valueTone} align="right" className={amountStyles}>
                        {amountSign !== null && `${amountSign}${SPACE.THSP}`}
                        {primaryAmount}
                    </Text>
                </Cell.Row>
                <Cell.Row>
                    <Counterparty counterparty={counterparty} />
                    <Text variant="bodyM" tone="tertiary" align="right" className={amountStyles}>
                        {secondaryAmount}
                    </Text>
                </Cell.Row>
            </Cell.Content>
        </Cell>
    );
});

export const ActivityItemSkeleton: FC = () => (
    <Cell>
        <Cell.Content>
            <Cell.Row>
                <Skeleton width={96} height={24} />
                <Skeleton width={112} height={24} />
            </Cell.Row>
            <Cell.Row>
                <Skeleton width={128} height={20} />
                <Skeleton width={72} height={20} />
            </Cell.Row>
        </Cell.Content>
    </Cell>
);
