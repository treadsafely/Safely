import { useIsFocused } from '@react-navigation/native';
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
    HistoryList,
    useNewTransactionsBubble,
    useScrollToTopOnNewTx
} from '../HistoryList';

type BtcHistoryListProps = {
    onNavigateToActivityItem: (activity: BtcHistoryItem) => void;
};

export const BtcHistoryList = (props: BtcHistoryListProps) => {
    const listRef = useRef<ListRef<HistoryRowItem>>(null);
    const { groups, fetchNextPage } = useBtcHistoryGroups();
    const bubble = useNewTransactionsBubble({ listRef, topThreshold: 44 });

    useScrollToTopOnNewTx(listRef, useLastBroadcastedBtcTx()?.txId);
    useBtcHistoryPolling({ isEnabled: useIsFocused(), onNewActivity: bubble.show });

    return (
        <HistoryList
            listRef={listRef}
            bubble={bubble}
            groups={groups}
            fetchNextPage={fetchNextPage}
            onNavigateToActivityItem={props.onNavigateToActivityItem}
        />
    );
};
