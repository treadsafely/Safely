import type { TFunction } from 'i18next';

import type { DateGroupMeta, PendingGroupMeta } from '@safely/core';
import { GROUP_LABEL, assertUnreachable, ellipsisMiddle } from '@safely/core';
import type {
    useActivePortfolioRate,
    useActualBtcBlockNumber,
    useContacts,
    useNumberFormatter,
    usePortfolios
} from '@safely/ux';
import {
    type ActivityItem,
    type BtcActivityItem,
    type DateFormatter,
    type OrderActivityItem,
    findContactMetaByAddress,
    findPortfolioMetaByAddress,
    getBtcTransactionDisplayStatus,
    isRampOrderActive,
    resolveSentAmount
} from '@safely/ux';

import type { ActivityItemProps } from '@mobile/entities/activity';
import { getDateGroupTitle } from '@mobile/shared/utils';

export type HistoryHeaderRow = {
    key: string;
    type: 'header';
    title: string;
};

export type ActivityRow = ActivityItemProps & {
    key: string;
    type: 'activity';
};

export type HistoryRowItem = HistoryHeaderRow | ActivityRow;

export type ActivityRowContext = {
    t: TFunction;
    dateFormatterTime: DateFormatter;
    dateFormatterDayMonth: DateFormatter;
    numberFormatter: ReturnType<typeof useNumberFormatter>;
    portfolios: ReturnType<typeof usePortfolios>;
    contacts: ReturnType<typeof useContacts>;
    rateData: ReturnType<typeof useActivePortfolioRate>['data'];
    currentBlockNumber: ReturnType<typeof useActualBtcBlockNumber>['data'];
    showFullSentAmount: boolean;
    onNavigateToActivityItem: (activity: ActivityItem) => void;
};

export type TimeFormatDetails = 'time' | 'day-month-time';

export const timeFormatDetailsByGroupLabel: Record<GROUP_LABEL, TimeFormatDetails> = {
    [GROUP_LABEL.PENDING]: 'time',
    [GROUP_LABEL.TODAY]: 'time',
    [GROUP_LABEL.YESTERDAY]: 'time',
    [GROUP_LABEL.THIS_MONTH]: 'time',
    [GROUP_LABEL.THIS_YEAR]: 'day-month-time',
    [GROUP_LABEL.PAST_YEAR]: 'day-month-time'
};

const getHistoryGroupTitle = (
    meta: DateGroupMeta | PendingGroupMeta,
    t: TFunction,
    formatter: DateFormatter
): string =>
    meta.label === GROUP_LABEL.PENDING
        ? t('dateGroups.pending')
        : getDateGroupTitle(meta, t, formatter);

export const buildHeaderRow = (
    meta: DateGroupMeta | PendingGroupMeta,
    groupKey: string,
    t: TFunction,
    groupFormatter: DateFormatter
): HistoryHeaderRow => ({
    key: `header-${groupKey}`,
    type: 'header',
    title: getHistoryGroupTitle(meta, t, groupFormatter)
});

const formatTimestampLabel = (
    timestamp: number,
    timeFormatDetails: TimeFormatDetails,
    context: ActivityRowContext
): string =>
    timeFormatDetails === 'time'
        ? context.dateFormatterTime.format(timestamp)
        : context.dateFormatterDayMonth.format(timestamp);

const buildTransactionRow = (
    activity: BtcActivityItem,
    groupKey: string,
    timeFormatDetails: TimeFormatDetails,
    context: ActivityRowContext
): ActivityRow => {
    const isInitiator = activity.transaction.isInitiator;
    const displayStatus = getBtcTransactionDisplayStatus(
        activity.transaction.raw,
        context.currentBlockNumber
    );
    const isPending = displayStatus.type === 'pending';

    const title = isPending
        ? isInitiator
            ? context.t('history.transactionInfo.sending')
            : context.t('history.transactionInfo.receiving')
        : isInitiator
          ? context.t('history.transactionInfo.sent')
          : context.t('history.transactionInfo.received');

    const amountSign: ActivityRow['amountSign'] = isInitiator ? '−' : '+';
    const { amount, isFullPrecision } = resolveSentAmount({
        isInitiator,
        value: activity.transaction.value,
        fee: activity.transaction.fee?.amount,
        showFullSentAmount: context.showFullSentAmount
    });
    const formattedValue = amount.format(context.numberFormatter, {
        fullPrecision: isFullPrecision
    });
    const rate = activity.transaction.rate;
    const formattedFiat = rate ? amount.convert(rate).format(context.numberFormatter) : null;
    const valueColor: ActivityRow['valueColor'] = isInitiator ? 'primary' : 'accentGreen';

    const timestampLabel = isPending
        ? null
        : formatTimestampLabel(activity.timestamp, timeFormatDetails, context);

    const counterpartyAddress = isInitiator
        ? activity.transaction.toAddress
        : activity.transaction.fromAddress;
    const portfolioMeta = findPortfolioMetaByAddress(context.portfolios, counterpartyAddress);
    const contactMeta = findContactMetaByAddress(context.contacts, counterpartyAddress);
    const counterparty: ActivityRow['counterparty'] = contactMeta
        ? { kind: 'contact', meta: contactMeta }
        : portfolioMeta
          ? { kind: 'portfolio', meta: portfolioMeta }
          : { kind: 'address', label: ellipsisMiddle(counterpartyAddress, 6) };

    const background: ActivityRow['background'] = isPending ? 'tertiary' : 'secondary';

    return {
        key: `activity-${groupKey}-${activity.key}`,
        type: 'activity',
        title,
        amountSign,
        formattedValue,
        valueColor,
        formattedFiat,
        timestampLabel,
        background,
        counterparty,
        onPress: () => context.onNavigateToActivityItem(activity)
    };
};

const buildOrderRow = (
    activity: OrderActivityItem,
    groupKey: string,
    timeFormatDetails: TimeFormatDetails,
    context: ActivityRowContext
): ActivityRow => {
    const { order } = activity;
    const isPending = isRampOrderActive(order);
    const isSale = order.type === 'offramp';
    const isUnsuccessful = !isPending && order.status !== 'completed';

    const formattedFiat = context.rateData
        ? activity.cryptoAmount?.convert(context.rateData).format(context.numberFormatter)
        : null;

    const title = (() => {
        switch (order.status) {
            case 'failed':
                return isSale
                    ? context.t('history.orderInfo.sale.failed')
                    : context.t('history.orderInfo.purchase.failed');
            case 'expired':
                return isSale
                    ? context.t('history.orderInfo.sale.cancelled')
                    : context.t('history.orderInfo.purchase.cancelled');
            default:
                return isSale
                    ? context.t('history.orderInfo.sale.default')
                    : context.t('history.orderInfo.purchase.default');
        }
    })();

    const amountSign: ActivityRow['amountSign'] = (() => {
        if (isUnsuccessful) return null;

        return isSale ? '−' : '+';
    })();

    const valueColor: ActivityRow['valueColor'] = (() => {
        if (isUnsuccessful) return 'tertiary';

        return isSale ? 'primary' : 'accentGreen';
    })();

    return {
        key: `activity-${groupKey}-${activity.key}`,
        type: 'activity',
        title,
        amountSign,
        formattedValue: activity.cryptoAmount?.format(context.numberFormatter) ?? '-',
        valueColor,
        formattedFiat: formattedFiat ?? null,
        timestampLabel: isPending
            ? null
            : formatTimestampLabel(activity.timestamp, timeFormatDetails, context),
        background: isPending ? 'tertiary' : 'secondary',
        counterparty: {
            kind: 'provider',
            label: order.provider
        },
        onPress: () => context.onNavigateToActivityItem(activity)
    };
};

export function buildActivityRow(
    activity: ActivityItem,
    groupKey: string,
    timeFormatDetails: TimeFormatDetails,
    context: ActivityRowContext
): ActivityRow {
    switch (activity.type) {
        case 'transaction':
            return buildTransactionRow(activity, groupKey, timeFormatDetails, context);
        case 'order':
            return buildOrderRow(activity, groupKey, timeFormatDetails, context);
        default:
            return assertUnreachable(activity as never);
    }
}
