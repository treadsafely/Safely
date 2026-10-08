import type { ActivityItem, HistoryGroupView } from '@safely/ux';

import type { ActivityItemProps } from '@mobile/entities/activity';

export type HistoryHeaderRow = {
    key: string;
    type: 'header';
    title: string;
};

export type HistoryActivityRow = {
    key: string;
    type: 'activity';
    props: ActivityItemProps;
};

export type HistoryRowItem = HistoryHeaderRow | HistoryActivityRow;

export function buildHistoryRows(
    groups: HistoryGroupView[],
    onNavigateToActivityItem: (activity: ActivityItem) => void
): HistoryRowItem[] {
    return groups.flatMap(group => [
        { key: `header-${group.key}`, type: 'header' as const, title: group.title },
        ...group.rows.map(({ key, activity, ...props }) => ({
            key,
            type: 'activity' as const,
            props: { ...props, onPress: () => onNavigateToActivityItem(activity) }
        }))
    ]);
}
