import { useMemo } from 'react';

import { BTC_ASSET } from '@safely/core';

import { buildHistoryGroupViews } from './activity-row-view';
import type { HistoryGroupView } from './types';
import {
    useActivePortfolioRate,
    useContacts,
    useGroupedHistory,
    useNumberFormatter,
    usePortfolios
} from '../../entities';
import { useTranslate } from '../../shared';
import { useShowFullSentAmount } from '../amount-display';
import { useHistoryDateFormatters } from './useHistoryDateFormatters';

export function useHistoryGroups() {
    const t = useTranslate();
    const { groupFormatter, timeFormatter, dayMonthFormatter } = useHistoryDateFormatters();
    const numberFormatter = useNumberFormatter();
    const portfolios = usePortfolios();
    const contacts = useContacts();
    const { data: rate } = useActivePortfolioRate(BTC_ASSET);
    const showFullSentAmount = useShowFullSentAmount();

    const {
        data: historyGroups,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch
    } = useGroupedHistory();

    const groups = useMemo<HistoryGroupView[] | undefined>(() => {
        if (!historyGroups) {
            return undefined;
        }

        return buildHistoryGroupViews(historyGroups, {
            t,
            groupFormatter,
            timeFormatter,
            dayMonthFormatter,
            numberFormatter,
            portfolios,
            contacts,
            rate,
            showFullSentAmount
        });
    }, [
        historyGroups,
        t,
        groupFormatter,
        timeFormatter,
        dayMonthFormatter,
        numberFormatter,
        portfolios,
        contacts,
        rate,
        showFullSentAmount
    ]);

    return { groups, fetchNextPage, hasNextPage, isFetchingNextPage, refetch };
}
