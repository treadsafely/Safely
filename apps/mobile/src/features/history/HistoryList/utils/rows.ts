import type { HistoryGroupView } from '@safely/ux';

import type { ActivityItemProps } from '@mobile/entities/activity';

export type HistoryListHeaderRow = {
    key: 'list-header';
    type: 'listHeader';
};

export type HistorySkeletonRow = {
    key: 'skeleton';
    type: 'skeleton';
};

export type HistoryEmptyRow = {
    key: 'empty';
    type: 'empty';
};

export type HistoryHeaderRow = {
    key: string;
    type: 'header';
    title: string;
    isFirst: boolean;
};

export type HistoryActivityRow = {
    key: string;
    type: 'activity';
    props: ActivityItemProps;
};

export type HistoryRowItem =
    | HistoryListHeaderRow
    | HistorySkeletonRow
    | HistoryEmptyRow
    | HistoryHeaderRow
    | HistoryActivityRow;

const LIST_HEADER_ROW: HistoryListHeaderRow = { key: 'list-header', type: 'listHeader' };
const SKELETON_ROW: HistorySkeletonRow = { key: 'skeleton', type: 'skeleton' };
const EMPTY_ROW: HistoryEmptyRow = { key: 'empty', type: 'empty' };

export function buildHistoryRows<TActivity>(
    groups: HistoryGroupView<TActivity>[] | undefined,
    onNavigateToActivityItem: (activity: TActivity) => void
): HistoryRowItem[] {
    if (!groups) {
        return [LIST_HEADER_ROW, SKELETON_ROW];
    }

    const rows = groups.flatMap((group, groupIndex) => [
        {
            key: `header-${group.key}`,
            type: 'header' as const,
            title: group.title,
            isFirst: groupIndex === 0
        },
        ...group.rows.map(({ key, activity, ...props }) => ({
            key,
            type: 'activity' as const,
            props: { ...props, onPress: () => onNavigateToActivityItem(activity) }
        }))
    ]);

    return [LIST_HEADER_ROW, ...(rows.length === 0 ? [EMPTY_ROW] : rows)];
}
