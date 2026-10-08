import type { FC } from 'react';

import type { ActivityItem } from '@safely/ux';
import { useHistoryGroups } from '@safely/ux';

import { HistoryEmptyPlaceholder } from './HistoryEmptyPlaceholder';
import { groupStyles, listStyles, loaderStyles, sentinelStyles } from './HistoryList.styles';
import { ActivityItem as ActivityItemView, ActivityItemSkeleton } from '../../entities';
import { List, Skeleton, Spinner, useOnVisible } from '../../shared';

const SKELETON_ROWS = [0, 1, 2];
const PREFETCH_MARGIN = '400px';

export type HistoryListProps = {
    selectedActivityKey?: string;
    onSelectActivity: (activity: ActivityItem) => void;
    onReceive: () => void;
};

export const HistoryList: FC<HistoryListProps> = props => {
    const { selectedActivityKey, onSelectActivity, onReceive } = props;

    const { groups, fetchNextPage, hasNextPage, isFetchingNextPage } = useHistoryGroups();

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
        return <HistoryEmptyPlaceholder onReceive={onReceive} />;
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
                                isSelected={activity.key === selectedActivityKey}
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
