import type { TFunction } from 'i18next';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
    GROUP_LABEL,
    groupByDate,
    type DateGroupMeta,
    type GroupByDateOptions
} from '@safely/core';
import type { DateFormatter } from '@safely/ux';
import { useDateFormatter } from '@safely/ux';

export const getDateGroupTitle = (
    meta: DateGroupMeta,
    t: TFunction,
    formatter: DateFormatter
): string => {
    switch (meta.label) {
        case GROUP_LABEL.TODAY:
            return t('dateGroups.today');
        case GROUP_LABEL.YESTERDAY:
            return t('dateGroups.yesterday');
        case GROUP_LABEL.THIS_MONTH: {
            const date = new Date(meta.year, meta.month, meta.day);
            return formatter({ month: 'long', day: 'numeric' }).format(date);
        }
        case GROUP_LABEL.THIS_YEAR: {
            const date = new Date(meta.year, meta.month, 1);
            return formatter({ month: 'long' }).format(date);
        }
        case GROUP_LABEL.PAST_YEAR: {
            const date = new Date(meta.year, meta.month, 1);
            return formatter({ month: 'long', year: 'numeric' }).format(date);
        }
    }
};

export type GroupedRow<T> =
    { key: string; type: 'header'; title: string } | { key: string; type: 'item'; item: T };

export const getGroupedRowType = <T>(row: GroupedRow<T>) => row.type;

export function useGroupedRows<T>(
    items: T[],
    getTimestamp: (item: T) => number,
    getItemKey: (item: T) => string,
    options?: GroupByDateOptions
): GroupedRow<T>[] {
    const { t } = useTranslation();
    const formatter = useDateFormatter();

    return useMemo(
        () =>
            groupByDate(items, getTimestamp, options).flatMap(group => {
                const title = getDateGroupTitle(group.meta, t, formatter);
                return [
                    { key: `header-${group.key}`, type: 'header' as const, title },
                    ...group.items.map(item => ({
                        key: `item-${getItemKey(item)}`,
                        type: 'item' as const,
                        item
                    }))
                ];
            }),
        [items, getTimestamp, getItemKey, options, t, formatter]
    );
}
