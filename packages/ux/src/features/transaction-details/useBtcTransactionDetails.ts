import { useMemo } from 'react';

import { BLOCKCHAIN_NAME } from '@safely/core';

import { buildBtcTransactionDetailsView } from './btc-transaction-details-view';
import { useBtcTransactionStatusView } from './btc-transaction-status';
import { CONFIRMED_AT_FORMAT } from './transaction-details-view';
import type { BtcTransactionDetailsView } from './types';
import type { BtcActivityItem } from '../../entities';
import {
    isBtcActivityItem,
    useContacts,
    useExplorer,
    useGroupedBtcHistory,
    useNumberFormatter,
    usePortfolios
} from '../../entities';
import { useDateFormatter, useTranslate } from '../../shared';
import { useShowFullSentAmount, useTransactionHistoryAmountOrder } from '../amount-display';

function useLatestBtcActivity(activity: BtcActivityItem): BtcActivityItem {
    const { data: groups } = useGroupedBtcHistory();

    return useMemo(() => {
        const latest = groups
            ?.flatMap(group => group.items)
            .find(item => item.key === activity.key);

        return latest !== undefined && isBtcActivityItem(latest) ? latest : activity;
    }, [groups, activity]);
}

export function useBtcTransactionDetails(
    openedActivity: BtcActivityItem
): BtcTransactionDetailsView {
    const t = useTranslate();
    const numberFormatter = useNumberFormatter();
    const activity = useLatestBtcActivity(openedActivity);
    const confirmedAtFormatter = useDateFormatter(CONFIRMED_AT_FORMAT);
    const explorer = useExplorer(BLOCKCHAIN_NAME.BTC);
    const showFullSentAmount = useShowFullSentAmount();
    const amountOrder = useTransactionHistoryAmountOrder();
    const status = useBtcTransactionStatusView(activity.transaction.raw);
    const contacts = useContacts();
    const portfolios = usePortfolios();

    return buildBtcTransactionDetailsView(activity, {
        t,
        contacts,
        portfolios,
        confirmedAtFormatter,
        numberFormatter,
        showFullSentAmount,
        amountOrder,
        status,
        explorerUrl: explorer.transaction(activity.transaction.raw.txid)
    });
}
