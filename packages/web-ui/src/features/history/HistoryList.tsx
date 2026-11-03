import type { ReactElement } from 'react';

import type { HistoryGroupView } from '@safely/ux';

import { HistoryEmptyPlaceholder } from './HistoryEmptyPlaceholder';
import { groupStyles, listStyles, loaderStyles, sentinelStyles } from './HistoryList.styles';
import { ActivityItem as ActivityItemView, ActivityItemSkeleton } from '../../entities';
import { List, Skeleton, Spinner, useOnVisible } from '../../shared';

const SKELETON_ROWS = [0, 1, 2];
const PREFETCH_MARGIN = '400px';

export type HistoryListProps<TActivity> = {
    groups: HistoryGroupView<TActivity>[] | undefined;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => unknown;
    assetSymbol: string;
    selectedActivityKey?: string;
    getActivityKey: (activity: TActivity) => string;
    onSelectActivity: (activity: TActivity) => void;
    onReceive: () => void;
};

export const HistoryList = <TActivity,>(props: HistoryListProps<TActivity>): ReactElement => {
    const {
        groups,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        assetSymbol,
        selectedActivityKey,
        getActivityKey,
        onSelectActivity,
        onReceive
    } = props;

    const sentinelRef = useOnVisible(fetchNextPage, {
        isEnabled: hasNextPage && !isFetchingNextPage,
        rootMargin: PREFETCH_MARGIN
    });

    if (!groups) {
        return (
            <div className={listStyles}>
                <List>
                    <List.Title variant="heading">
                        <Skeleton width={72} height={20} />
                    </List.Title>
                    <List.Group variant="separated" className={groupStyles}>
                        {SKELETON_ROWS.map(row => (
                            <ActivityItemSkeleton key={row} />
                        ))}
                    </List.Group>
                </List>
            </div>
        );
    }

    if (groups.length === 0) {
        return <HistoryEmptyPlaceholder assetSymbol={assetSymbol} onReceive={onReceive} />;
    }

    return (
        <div className={listStyles}>
            {groups.map(group => (
                <List key={group.key}>
                    <List.Title variant="heading">{group.title}</List.Title>
                    <List.Group variant="separated" className={groupStyles}>
                        {group.rows.map(({ key, activity, ...row }) => (
                            <ActivityItemView
                                key={key}
                                {...row}
                                isSelected={getActivityKey(activity) === selectedActivityKey}
                                onSelect={() => onSelectActivity(activity)}
                            />
                        ))}
                    </List.Group>
                </List>
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
