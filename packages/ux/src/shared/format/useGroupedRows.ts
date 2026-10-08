import { useMemo } from 'react';

import type { GroupByDateOptions } from '@safely/core';
import { groupByDate } from '@safely/core';

import { useDateFormatter } from './date';
import { getDateGroupTitle } from './date-groups';
import { useTranslate } from '../i18n';

export type GroupedRow<T> =
    { key: string; type: 'header'; title: string } | { key: string; type: 'item'; item: T };

export const getGroupedRowType = <T>(row: GroupedRow<T>) => row.type;

export function useGroupedRows<T>(
    items: T[],
    getTimestamp: (item: T) => number,
    getItemKey: (item: T) => string,
    options?: GroupByDateOptions
): GroupedRow<T>[] {
    const t = useTranslate();
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
