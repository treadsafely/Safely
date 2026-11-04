import type { FC } from 'react';

import { SPACE } from '@safely/core';
import type { ActivityRowView } from '@safely/ux';
import { orderAmounts, useTransactionHistoryAmountOrder } from '@safely/ux';
import ArrowDown16 from '@safely/ux/assets/icons/16/arrow-down-16.svg?react';
import ArrowTop16 from '@safely/ux/assets/icons/16/arrow-top-16.svg?react';
import { cx } from '@safely/web-ui/styled-system/css';

import {
    cellStyles,
    endCellStyles,
    gridStyles,
    interactiveStyles,
    typeStyles
} from './ActivityTableRow.styles';
import { CounterpartyLabel } from './CounterpartyLabel';
import type { IconAsset } from '../../shared';
import { Icon, Skeleton, Text } from '../../shared';

export type ActivityDirection = 'in' | 'out';

export type ActivityTableRowProps = Pick<
    ActivityRowView,
    'title' | 'amountSign' | 'formattedValue' | 'valueTone' | 'formattedFiat' | 'counterparty'
> & {
    dateLabel: string;
    direction: ActivityDirection;
    isCompact?: boolean;
    isSelected?: boolean;
    onSelect?: () => void;
};

const DIRECTION_ICONS: Record<ActivityDirection, IconAsset> = {
    in: ArrowDown16,
    out: ArrowTop16
};

export const ActivityTableRow: FC<ActivityTableRowProps> = props => {
    const {
        title,
        amountSign,
        formattedValue,
        valueTone,
        formattedFiat,
        counterparty,
        dateLabel,
        direction,
        isCompact,
        isSelected,
        onSelect
    } = props;

    const amountOrder = useTransactionHistoryAmountOrder();
    const [primaryAmount, secondaryAmount] = orderAmounts(
        amountOrder,
        formattedValue,
        formattedFiat
    );

    const cells = (
        <>
            <Text variant="bodyM" tone="secondary" isTruncated>
                {dateLabel}
            </Text>
            <span className={typeStyles}>
                <Icon asset={DIRECTION_ICONS[direction]} tone="primary" />
                <Text variant="bodyM" isTruncated>
                    {title}
                </Text>
            </span>
            <span className={cellStyles}>
                <CounterpartyLabel counterparty={counterparty} />
            </span>
            <Text variant="bodyM" tone="tertiary" align="right" isTabular isTruncated>
                {secondaryAmount}
            </Text>
            <Text variant="bodyM" tone={valueTone} align="right" isTabular isTruncated>
                {amountSign !== null && `${amountSign}${SPACE.THSP}`}
                {primaryAmount}
            </Text>
        </>
    );

    const compact = isCompact || undefined;

    if (onSelect === undefined) {
        return (
            <div className={gridStyles} data-compact={compact}>
                {cells}
            </div>
        );
    }

    return (
        <button
            type="button"
            className={cx(gridStyles, interactiveStyles)}
            data-compact={compact}
            data-selected={isSelected || undefined}
            onClick={onSelect}
        >
            {cells}
        </button>
    );
};

export const ActivityTableRowSkeleton: FC = () => (
    <div className={gridStyles}>
        <Skeleton width={96} height={20} />
        <Skeleton width={80} height={20} />
        <Skeleton width={112} height={20} />
        <span className={endCellStyles}>
            <Skeleton width={64} height={20} />
        </span>
        <span className={endCellStyles}>
            <Skeleton width={96} height={20} />
        </span>
    </div>
);
