import type { ReactElement } from 'react';

import type { HistoryGroupView } from '@safely/ux';
import { useRelativeDateLabel, useTranslate } from '@safely/ux';

import { HistoryEmptyPlaceholder } from './HistoryEmptyPlaceholder';
import { loaderStyles, sentinelStyles, tableStyles } from './HistoryTable.styles';
import type { ActivityDirection } from '../../entities';
import { ActivityTableRow, ActivityTableRowSkeleton } from '../../entities';
import { Spinner, useOnVisible } from '../../shared';

const SKELETON_ROWS = [0, 1, 2];
const PREFETCH_MARGIN = '400px';

export type HistoryTableProps<TActivity> = {
    groups: HistoryGroupView<TActivity>[] | undefined;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => unknown;
    assetSymbol: string;
    selectedActivityKey?: string;
    getActivityKey: (activity: TActivity) => string;
    getTimestamp: (activity: TActivity) => number | null;
    getDirection: (activity: TActivity) => ActivityDirection;
    onSelectActivity: (activity: TActivity) => void;
    onReceive: () => void;
};

export const HistoryTable = <TActivity,>(props: HistoryTableProps<TActivity>): ReactElement => {
    const {
        groups,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        assetSymbol,
        selectedActivityKey,
        getActivityKey,
        getTimestamp,
        getDirection,
        onSelectActivity,
        onReceive
    } = props;

    const t = useTranslate();
    const dateLabel = useRelativeDateLabel();

    const sentinelRef = useOnVisible(fetchNextPage, {
        isEnabled: hasNextPage && !isFetchingNextPage,
        rootMargin: PREFETCH_MARGIN
    });

    const resolveDateLabel = (activity: TActivity, isPending: boolean): string => {
        if (isPending) {
            return t('history.table.pending');
        }

        const timestamp = getTimestamp(activity);

        return timestamp === null ? '' : dateLabel(timestamp);
    };

    if (!groups) {
        return (
            <div className={tableStyles}>
                {SKELETON_ROWS.map(row => (
                    <ActivityTableRowSkeleton key={row} />
                ))}
            </div>
        );
    }

    if (groups.length === 0) {
        return <HistoryEmptyPlaceholder assetSymbol={assetSymbol} onReceive={onReceive} />;
    }

    return (
        <div className={tableStyles}>
            {groups
                .flatMap(group => group.rows)
                .map(row => (
                    <ActivityTableRow
                        key={row.key}
                        title={row.title}
                        amountSign={row.amountSign}
                        formattedValue={row.formattedValue}
                        valueTone={row.valueTone}
                        formattedFiat={row.formattedFiat}
                        counterparty={row.counterparty}
                        dateLabel={resolveDateLabel(row.activity, row.isPending)}
                        direction={getDirection(row.activity)}
                        isSelected={getActivityKey(row.activity) === selectedActivityKey}
                        onSelect={() => onSelectActivity(row.activity)}
                    />
                ))}

            {hasNextPage && <div ref={sentinelRef} className={sentinelStyles} />}

            {isFetchingNextPage && (
                <div className={loaderStyles}>
                    <Spinner />
                </div>
            )}
        </div>
    );
};
