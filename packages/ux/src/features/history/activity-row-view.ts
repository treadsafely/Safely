import type {
    Contact,
    CryptoFiatRate,
    DatedGroup,
    FlameActivityItem,
    NumberFormatter,
    Portfolio
} from '@safely/core';
import { GROUP_LABEL, assertUnreachable, ellipsisMiddle } from '@safely/core';

import type { ActivityCounterparty, ActivityRowView, HistoryGroupView } from './types';
import type {
    ActivityItem,
    ActivityItemsDatedGroup,
    BtcActivityItem,
    FlameActivityItemsDatedGroup,
    OrderActivityItem
} from '../../entities';
import {
    findContactMetaByAddress,
    findPortfolioMetaByAddress,
    isActivityItemPending
} from '../../entities';
import type { DateFormatter, TranslateFn } from '../../shared';
import { getDateGroupTitle } from '../../shared';
import { resolveSentAmount } from '../amount-display';

export type ActivityRowContext = {
    t: TranslateFn;
    groupFormatter: DateFormatter;
    timeFormatter: DateFormatter;
    dayMonthFormatter: DateFormatter;
    numberFormatter: NumberFormatter;
    portfolios: Portfolio[];
    contacts: Contact[];
    rate: CryptoFiatRate | null | undefined;
    showFullSentAmount: boolean;
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

export function resolveActivityCounterparty(
    address: string,
    known: Pick<ActivityRowContext, 'contacts' | 'portfolios'>
): ActivityCounterparty {
    const contactMeta = findContactMetaByAddress(known.contacts, address);
    if (contactMeta) {
        return { kind: 'contact', meta: contactMeta };
    }

    const portfolioMeta = findPortfolioMetaByAddress(known.portfolios, address);
    if (portfolioMeta) {
        return { kind: 'portfolio', meta: portfolioMeta };
    }

    return { kind: 'address', label: ellipsisMiddle(address, 6) };
}

const buildTransactionRow = (
    activity: BtcActivityItem,
    groupKey: string,
    timeFormatDetails: TimeFormatDetails,
    context: ActivityRowContext
): ActivityRowView => {
    const isInitiator = activity.transaction.isInitiator;
    const isPending = isActivityItemPending(activity);

    const title = isPending
        ? isInitiator
            ? context.t('history.transactionInfo.sending')
            : context.t('history.transactionInfo.receiving')
        : isInitiator
          ? context.t('history.transactionInfo.sent')
          : context.t('history.transactionInfo.received');

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
        title,
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
    context: ActivityRowContext
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

function buildActivityRowView(
    activity: ActivityItem,
    groupKey: string,
    timeFormatDetails: TimeFormatDetails,
    context: ActivityRowContext
): ActivityRowView {
    switch (activity.type) {
        case 'transaction':
            return buildTransactionRow(activity, groupKey, timeFormatDetails, context);
        case 'order':
            return buildOrderRow(activity, groupKey, timeFormatDetails, context);
        default:
            return assertUnreachable(activity as never);
    }
}

function buildGroupViews<TActivity>(
    groups: DatedGroup<TActivity, ActivityItemsDatedGroup['meta']>[],
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

export function buildHistoryGroupViews(
    groups: ActivityItemsDatedGroup[],
    context: ActivityRowContext
): HistoryGroupView[] {
    return buildGroupViews(groups, context, (activity, groupKey, timeFormatDetails) =>
        buildActivityRowView(activity, groupKey, timeFormatDetails, context)
    );
}

export type FlameActivityRowContext = Omit<ActivityRowContext, 'rate' | 'showFullSentAmount'>;

const flameTitleKeys = {
    pending: {
        sent: 'history.transactionInfo.sending',
        received: 'history.transactionInfo.receiving'
    },
    confirmed: {
        sent: 'history.transactionInfo.sent',
        received: 'history.transactionInfo.received'
    }
} as const;

const buildFlameRow = (
    activity: FlameActivityItem,
    groupKey: string,
    timeFormatDetails: TimeFormatDetails,
    context: FlameActivityRowContext
): ActivityRowView<FlameActivityItem> => {
    const { isInitiator, isPending, timestamp, counterpartyAddress } = activity;
    const direction = isInitiator ? 'sent' : 'received';

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

    return {
        key: `${groupKey}-${activity.txid}`,
        activity,
        title: context.t(flameTitleKeys[isPending ? 'pending' : 'confirmed'][direction]),
        amountSign: isInitiator ? '−' : '+',
        formattedValue: activity.hasUnreadableOutputs
            ? '–'
            : activity.value.format(context.numberFormatter),
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
    groups: FlameActivityItemsDatedGroup[],
    context: FlameActivityRowContext
): HistoryGroupView<FlameActivityItem>[] {
    return buildGroupViews(groups, context, (activity, groupKey, timeFormatDetails) =>
        buildFlameRow(activity, groupKey, timeFormatDetails, context)
    );
}
