import { useMemo } from 'react';

import { BLOCKCHAIN_NAME } from '@safely/core';

import { useBtcTransactionStatusView } from './btc-transaction-status';
import { buildTransactionDetailsView } from './transaction-details-view';
import type { TransactionDetailsView } from './types';
import type { BtcActivityItem } from '../../entities';
import {
    isBtcActivityItem,
    useExplorer,
    useGroupedHistory,
    useNumberFormatter
} from '../../entities';
import { useDateFormatter, useTranslate } from '../../shared';
import { useShowFullSentAmount, useTransactionHistoryAmountOrder } from '../amount-display';

const CONFIRMED_AT_FORMAT = {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
} as const;

function useLatestActivity(activity: BtcActivityItem): BtcActivityItem {
    const { data: groups } = useGroupedHistory();

    return useMemo(() => {
        const latest = groups
            ?.flatMap(group => group.items)
            .find(item => item.key === activity.key);

        return latest !== undefined && isBtcActivityItem(latest) ? latest : activity;
    }, [groups, activity]);
}

export function useTransactionDetails(openedActivity: BtcActivityItem): TransactionDetailsView {
    const t = useTranslate();
    const numberFormatter = useNumberFormatter();
    const activity = useLatestActivity(openedActivity);
    const confirmedAtFormatter = useDateFormatter(CONFIRMED_AT_FORMAT);
    const explorer = useExplorer(BLOCKCHAIN_NAME.BTC);
    const showFullSentAmount = useShowFullSentAmount();
    const amountOrder = useTransactionHistoryAmountOrder();
    const status = useBtcTransactionStatusView(activity.transaction.raw);

    return buildTransactionDetailsView(activity, {
        t,
        confirmedAtFormatter,
        numberFormatter,
        showFullSentAmount,
        amountOrder,
        status,
        explorerUrl: explorer.transaction(activity.transaction.raw.txid)
    });
}
