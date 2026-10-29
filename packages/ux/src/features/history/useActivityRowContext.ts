import { useMemo } from 'react';

import type { ActivityRowContext } from './activity-row-view';
import { useHistoryDateFormatters } from './useHistoryDateFormatters';
import { useContacts, useNumberFormatter, usePortfolios } from '../../entities';
import { useTranslate } from '../../shared';
import { useShowFullSentAmount } from '../amount-display';

export function useActivityRowContext(): ActivityRowContext {
    const t = useTranslate();
    const { groupFormatter, timeFormatter, dayMonthFormatter } = useHistoryDateFormatters();
    const numberFormatter = useNumberFormatter();
    const portfolios = usePortfolios();
    const contacts = useContacts();
    const showFullSentAmount = useShowFullSentAmount();

    return useMemo(
        () => ({
            t,
            groupFormatter,
            timeFormatter,
            dayMonthFormatter,
            numberFormatter,
            portfolios,
            contacts,
            showFullSentAmount
        }),
        [
            t,
            groupFormatter,
            timeFormatter,
            dayMonthFormatter,
            numberFormatter,
            portfolios,
            contacts,
            showFullSentAmount
        ]
    );
}
