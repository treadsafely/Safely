import { useIsFocused } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { useRef } from 'react';

import type { FlameHistoryItem } from '@safely/core';
import {
    useFlameHistoryGroups,
    useFlameHistoryPolling,
    useLatestPendingSentFlameTxId
} from '@safely/ux';

import type { ListRef } from '@mobile/shared/ui/Screen/components/List';

import {
    type HistoryRowItem,
    type HistoryScroll,
    HistoryList,
    useNewTransactionsBubble,
    useScrollToTopOnNewTx
} from '../HistoryList';

type FlameHistoryListProps = {
    scroll: HistoryScroll;
    header: ReactNode;
    onNavigateToActivityItem: (activity: FlameHistoryItem) => void;
};

export const FlameHistoryList = (props: FlameHistoryListProps) => {
    const listRef = useRef<ListRef<HistoryRowItem>>(null);
    const { groups, fetchNextPage } = useFlameHistoryGroups();
    const bubble = useNewTransactionsBubble({ listRef, scroll: props.scroll });

    useScrollToTopOnNewTx(listRef, useLatestPendingSentFlameTxId());
    useFlameHistoryPolling({ isEnabled: useIsFocused(), onNewActivity: bubble.show });

    return (
        <HistoryList
            listRef={listRef}
            bubble={bubble}
            scroll={props.scroll}
            header={props.header}
            groups={groups}
            fetchNextPage={fetchNextPage}
            onNavigateToActivityItem={props.onNavigateToActivityItem}
        />
    );
};
