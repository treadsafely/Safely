import { useIsFocused } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { useRef } from 'react';

import {
    type BtcHistoryItem,
    useBtcHistoryGroups,
    useBtcHistoryPolling,
    useLastBroadcastedBtcTx
} from '@safely/ux';

import type { ListRef } from '@mobile/shared/ui/Screen/components/List';

import {
    type HistoryRowItem,
    type HistoryScroll,
    HistoryList,
    useNewTransactionsBubble,
    useScrollToTopOnNewTx
} from '../HistoryList';

type BtcHistoryListProps = {
    scroll: HistoryScroll;
    header: ReactNode;
    onNavigateToActivityItem: (activity: BtcHistoryItem) => void;
};

export const BtcHistoryList = (props: BtcHistoryListProps) => {
    const listRef = useRef<ListRef<HistoryRowItem>>(null);
    const { groups, fetchNextPage } = useBtcHistoryGroups();
    const bubble = useNewTransactionsBubble({ listRef, scroll: props.scroll });

    useScrollToTopOnNewTx(listRef, useLastBroadcastedBtcTx()?.txId);
    useBtcHistoryPolling({ isEnabled: useIsFocused(), onNewActivity: bubble.show });

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
