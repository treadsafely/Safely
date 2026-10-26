import { useIsFocused } from '@react-navigation/native';
import { useRef } from 'react';

import type { FlameActivityItem } from '@safely/core';
import { useFlameHistoryGroups, useFlameHistoryPolling } from '@safely/ux';

import type { ListRef } from '@mobile/shared/ui/Screen/components/List';

import { type HistoryRowItem, HistoryListView, useNewTransactionsBubble } from '../HistoryList';

type FlameHistoryListProps = {
    onNavigateToActivityItem: (activity: FlameActivityItem) => void;
};

export const FlameHistoryList = (props: FlameHistoryListProps) => {
    const listRef = useRef<ListRef<HistoryRowItem>>(null);
    const { groups, fetchNextPage } = useFlameHistoryGroups();
    const bubble = useNewTransactionsBubble({ listRef, topThreshold: 44 });

    useFlameHistoryPolling({ isEnabled: useIsFocused(), onNewActivity: bubble.show });

    return (
        <HistoryListView
            listRef={listRef}
            bubble={bubble}
            groups={groups}
            fetchNextPage={fetchNextPage}
            onNavigateToActivityItem={props.onNavigateToActivityItem}
        />
    );
};
