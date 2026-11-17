import { useMemo } from 'react';

import { BLOCKCHAIN_NAME, type FlameHistoryItem } from '@safely/core';

import { buildFlameTransactionDetailsView } from './flame-transaction-details-view';
import { buildFlameTransactionStatusView } from './flame-transaction-status';
import { CONFIRMED_AT_FORMAT, STATUS_DATE_FORMAT } from './transaction-details-view';
import type { FlameTransactionDetailsView } from './types';
import {
    useActiveFlameWallet,
    useContacts,
    useExplorerFactory,
    useFlameHistory,
    useNumberFormatter,
    usePortfolios
} from '../../entities';
import { useDateFormatter, useTranslate } from '../../shared';
import { useShowFullSentAmount } from '../amount-display';

function useLatestFlameActivity(activity: FlameHistoryItem): FlameHistoryItem {
    const { data } = useFlameHistory();

    return useMemo(
        () =>
            data?.pages.flatMap(page => page.items).find(item => item.txid === activity.txid) ??
            activity,
        [data, activity]
    );
}

export function useFlameTransactionDetails(
    openedActivity: FlameHistoryItem
): FlameTransactionDetailsView {
    const t = useTranslate();
    const numberFormatter = useNumberFormatter();
    const activity = useLatestFlameActivity(openedActivity);
    const confirmedAtFormatter = useDateFormatter(CONFIRMED_AT_FORMAT);
    const statusFormatter = useDateFormatter(STATUS_DATE_FORMAT);
    const showFullSentAmount = useShowFullSentAmount();
    const contacts = useContacts();
    const portfolios = usePortfolios();
    const { network } = useActiveFlameWallet();
    const explorerFactory = useExplorerFactory();
    const explorer = useMemo(
        () => explorerFactory.createExplorer(BLOCKCHAIN_NAME.FLAME, network),
        [explorerFactory, network]
    );

    return buildFlameTransactionDetailsView(activity, {
        t,
        contacts,
        portfolios,
        confirmedAtFormatter,
        numberFormatter,
        showFullSentAmount,
        status: buildFlameTransactionStatusView(activity, { t, statusFormatter }),
        explorerUrl: explorer?.transaction(activity.txid) ?? null
    });
}
