import type { FC } from 'react';

import { assertUnreachable } from '@safely/core';
import type { BtcHistoryItem } from '@safely/ux';
import {
    useBtcHistoryGroups,
    useBtcHistoryPolling,
    useRelativeDateLabel,
    useTranslate
} from '@safely/ux';

import { HistoryEmptyPlaceholder } from './HistoryEmptyPlaceholder';
import { loaderStyles, sentinelStyles, tableStyles } from './HistoryTable.styles';
import type { ActivityDirection } from '../../entities';
import { ActivityTableRow, ActivityTableRowSkeleton } from '../../entities';
import { Spinner, useIsDocumentVisible, useOnVisible } from '../../shared';

const SKELETON_ROWS = [0, 1, 2];
const PREFETCH_MARGIN = '400px';

function resolveActivityDirection(activity: BtcHistoryItem): ActivityDirection {
    switch (activity.type) {
        case 'transaction':
            return activity.transaction.isInitiator ? 'out' : 'in';
        case 'order':
            return activity.order.type === 'offramp' ? 'out' : 'in';
        default:
            return assertUnreachable(activity as never);
    }
}

export type HistoryTableProps = {
    selectedActivityKey?: string;
    onSelectActivity: (activity: BtcHistoryItem) => void;
    onReceive: () => void;
    onNewActivity: () => void;
};

export const HistoryTable: FC<HistoryTableProps> = props => {
    const { selectedActivityKey, onSelectActivity, onReceive, onNewActivity } = props;

    const t = useTranslate();
    const dateLabel = useRelativeDateLabel();
    const { groups, fetchNextPage, hasNextPage, isFetchingNextPage } = useBtcHistoryGroups();

    useBtcHistoryPolling({ isEnabled: useIsDocumentVisible(), onNewActivity });

    const sentinelRef = useOnVisible(fetchNextPage, {
        isEnabled: hasNextPage && !isFetchingNextPage,
        rootMargin: PREFETCH_MARGIN
    });

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
        return <HistoryEmptyPlaceholder onReceive={onReceive} />;
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
                        dateLabel={
                            row.isPending
                                ? t('history.table.pending')
                                : dateLabel(row.activity.timestamp)
                        }
                        direction={resolveActivityDirection(row.activity)}
                        isSelected={row.activity.key === selectedActivityKey}
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
