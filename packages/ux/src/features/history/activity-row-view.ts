import type {
    Contact,
    CryptoFiatRate,
    DatedGroup,
    FlameHistoryItem,
    NumberFormatter,
    Portfolio
} from '@safely/core';
import { GROUP_LABEL, assertUnreachable } from '@safely/core';

import type { ActivityRowView, HistoryGroupView } from './types';
import type {
    BtcHistoryItem,
    BtcHistoryItemsDatedGroup,
    BtcActivityItem,
    FlameHistoryItemsDatedGroup,
    OrderActivityItem
} from '../../entities';
import { isActivityItemPending } from '../../entities';
import type { DateFormatter, TranslateFn } from '../../shared';
import { getDateGroupTitle } from '../../shared';
import type { ActivityCounterparty } from '../activity-display';
import {
    buildFlameActivityAmountView,
    resolveActivityCounterparty,
    transactionTitleKey
} from '../activity-display';
import { resolveSentAmount } from '../amount-display';

export type ActivityRowContext = {
    t: TranslateFn;
    groupFormatter: DateFormatter;
    timeFormatter: DateFormatter;
    dayMonthFormatter: DateFormatter;
    numberFormatter: NumberFormatter;
    portfolios: Portfolio[];
    contacts: Contact[];
    showFullSentAmount: boolean;
};

export type BtcActivityRowContext = ActivityRowContext & {
    rate: CryptoFiatRate | null | undefined;
};

type TimeFormatDetails = 'time' | 'day-month-time';

const timeFormatDetailsByGroupLabel: Record<GROUP_LABEL, TimeFormatDetails> = {
    [GROUP_LABEL.PENDING]: 'time',
    [GROUP_LABEL.TODAY]: 'time',
    [GROUP_LABEL.YESTERDAY]: 'time',
    [GROUP_LABEL.THIS_MONTH]: 'time',
    [GROUP_LABEL.THIS_YEAR]: 'day-month-time',
    [GROUP_LABEL.PAST_YEAR]: 'day-month-time'
};

const formatTimestampLabel = (
    timestamp: number,
    timeFormatDetails: TimeFormatDetails,
    context: Pick<ActivityRowContext, 'timeFormatter' | 'dayMonthFormatter'>
): string =>
    timeFormatDetails === 'time'
        ? context.timeFormatter.format(timestamp)
        : context.dayMonthFormatter.format(timestamp);

const buildBtcTransactionRow = (
    activity: BtcActivityItem,
    groupKey: string,
    timeFormatDetails: TimeFormatDetails,
    context: BtcActivityRowContext
): ActivityRowView => {
    const isInitiator = activity.transaction.isInitiator;
    const isPending = isActivityItemPending(activity);

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

    const counterpartyAddress = isInitiator
        ? activity.transaction.toAddress
        : activity.transaction.fromAddress;

    return {
        key: `${groupKey}-${activity.key}`,
        activity,
        title: context.t(transactionTitleKey({ isInitiator, isPending })),
        amountSign: isInitiator ? '−' : '+',
        formattedValue,
        valueTone: isInitiator ? 'primary' : 'accentGreen',
        formattedFiat,
        timestampLabel: isPending
            ? null
            : formatTimestampLabel(activity.timestamp, timeFormatDetails, context),
        isPending,
        counterparty: resolveActivityCounterparty(counterpartyAddress, context)
    };
};

const buildOrderRow = (
    activity: OrderActivityItem,
    groupKey: string,
    timeFormatDetails: TimeFormatDetails,
    context: BtcActivityRowContext
): ActivityRowView => {
    const { order } = activity;
    const isPending = isActivityItemPending(activity);
    const isSale = order.type === 'offramp';
    const isUnsuccessful = !isPending && order.status !== 'completed';

    const formattedFiat = context.rate
        ? activity.cryptoAmount?.convert(context.rate).format(context.numberFormatter)
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

    const amountSign: ActivityRowView['amountSign'] = (() => {
        if (isUnsuccessful) return null;

        return isSale ? '−' : '+';
    })();

    const valueTone: ActivityRowView['valueTone'] = (() => {
        if (isUnsuccessful) return 'tertiary';

        return isSale ? 'primary' : 'accentGreen';
    })();

    return {
        key: `${groupKey}-${activity.key}`,
        activity,
        title,
        amountSign,
        formattedValue: activity.cryptoAmount?.format(context.numberFormatter) ?? '-',
        valueTone,
        formattedFiat: formattedFiat ?? null,
        timestampLabel: isPending
            ? null
            : formatTimestampLabel(activity.timestamp, timeFormatDetails, context),
        isPending,
        counterparty: { kind: 'provider', label: order.provider }
    };
};

function buildBtcActivityRowView(
    activity: BtcHistoryItem,
    groupKey: string,
    timeFormatDetails: TimeFormatDetails,
    context: BtcActivityRowContext
): ActivityRowView {
    switch (activity.type) {
        case 'transaction':
            return buildBtcTransactionRow(activity, groupKey, timeFormatDetails, context);
        case 'order':
            return buildOrderRow(activity, groupKey, timeFormatDetails, context);
        default:
            return assertUnreachable(activity as never);
    }
}

function buildGroupViews<TActivity>(
    groups: DatedGroup<TActivity, BtcHistoryItemsDatedGroup['meta']>[],
    context: Pick<ActivityRowContext, 't' | 'groupFormatter'>,
    buildRow: (
        activity: TActivity,
        groupKey: string,
        timeFormatDetails: TimeFormatDetails
    ) => ActivityRowView<TActivity>
): HistoryGroupView<TActivity>[] {
    return groups.map(group => {
        const { key, meta, items } = group;
        const timeFormatDetails = timeFormatDetailsByGroupLabel[meta.label];

        return {
            key,
            title: getDateGroupTitle(meta, context.t, context.groupFormatter),
            rows: items.map(activity => buildRow(activity, key, timeFormatDetails))
        };
    });
}

export function buildBtcHistoryGroupViews(
    groups: BtcHistoryItemsDatedGroup[],
    context: BtcActivityRowContext
): HistoryGroupView[] {
    return buildGroupViews(groups, context, (activity, groupKey, timeFormatDetails) =>
        buildBtcActivityRowView(activity, groupKey, timeFormatDetails, context)
    );
}

const buildFlameTransactionRow = (
    activity: FlameHistoryItem,
    groupKey: string,
    timeFormatDetails: TimeFormatDetails,
    context: ActivityRowContext
): ActivityRowView<FlameHistoryItem> => {
    const { isInitiator, isPending, timestamp, counterpartyAddress } = activity;

    const counterparty: ActivityCounterparty = counterpartyAddress
        ? resolveActivityCounterparty(counterpartyAddress, context)
        : {
              kind: 'address',
              label: context.t(
                  isInitiator
                      ? 'history.transactionInfo.unknownRecipient'
                      : 'history.transactionInfo.unknownSender'
              )
          };

    const { amountSign, formattedValue } = buildFlameActivityAmountView(activity, context);

    return {
        key: `${groupKey}-${activity.txid}`,
        activity,
        title: context.t(transactionTitleKey({ isInitiator, isPending })),
        amountSign,
        formattedValue,
        valueTone: isInitiator ? 'primary' : 'accentGreen',
        formattedFiat: null,
        timestampLabel:
            isPending || timestamp === null
                ? null
                : formatTimestampLabel(timestamp, timeFormatDetails, context),
        isPending,
        counterparty,
        note: activity.memo
    };
};

export function buildFlameHistoryGroupViews(
    groups: FlameHistoryItemsDatedGroup[],
    context: ActivityRowContext
): HistoryGroupView<FlameHistoryItem>[] {
    return buildGroupViews(groups, context, (activity, groupKey, timeFormatDetails) =>
        buildFlameTransactionRow(activity, groupKey, timeFormatDetails, context)
    );
}
