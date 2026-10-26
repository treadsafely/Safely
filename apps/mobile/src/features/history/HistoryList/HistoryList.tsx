import { useIsFocused } from '@react-navigation/native';
import { useRef } from 'react';

import {
    type ActivityItem as ActivityItemData,
    useHistoryGroups,
    useHistoryPolling
} from '@safely/ux';

import type { ListRef } from '@mobile/shared/ui/Screen/components/List';

import { useNewTransactionsBubble } from './components';
import { HistoryListView } from './HistoryListView';
import { useScrollToTopOnNewBroadcastedTx } from './hooks';
import type { HistoryRowItem } from './utils/rows';

type HistoryListProps = {
    onNavigateToActivityItem: (activity: ActivityItemData) => void;
};

export const HistoryList = (props: HistoryListProps) => {
    const listRef = useRef<ListRef<HistoryRowItem>>(null);
    const { groups, fetchNextPage } = useHistoryGroups();
    const bubble = useNewTransactionsBubble({ listRef, topThreshold: 44 });

    useScrollToTopOnNewBroadcastedTx(listRef);
    useHistoryPolling({ isEnabled: useIsFocused(), onNewActivity: bubble.show });

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
