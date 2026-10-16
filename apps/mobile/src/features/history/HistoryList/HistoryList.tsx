import { useIsFocused, useScrollToTop } from '@react-navigation/native';
import { useCallback, useMemo, useRef } from 'react';
import { useWindowDimensions, View } from 'react-native';

import {
    type ActivityItem as ActivityItemData,
    useHistoryGroups,
    useHistoryPolling
} from '@safely/ux';

import { ActivityItem, ActivityItemSkeleton } from '@mobile/entities/activity';
import { List, Screen, Text } from '@mobile/shared/ui';
import type { ListRef } from '@mobile/shared/ui/Screen/components/List';

import { HistoryEmptyPlaceholder } from '../HistoryEmptyPlaceholder';
import { NewTransactionsBubble, useNewTransactionsBubble } from './components';
import { styles } from './HistoryList.styles';
import { useScrollToTopOnNewBroadcastedTx } from './hooks';
import { type HistoryRowItem, buildHistoryRows } from './utils/rows';

type HistoryListProps = {
    onNavigateToActivityItem: (activity: ActivityItemData) => void;
};

export const HistoryList = (props: HistoryListProps) => {
    const { onNavigateToActivityItem } = props;

    const isFocused = useIsFocused();
    const listRef = useRef<ListRef<HistoryRowItem>>(null);
    const { groups, fetchNextPage } = useHistoryGroups();
    const windowHeight = useWindowDimensions().height;

    useScrollToTop(listRef);
    useScrollToTopOnNewBroadcastedTx(listRef);

    const {
        scrollHandler,
        mode: bubbleMode,
        onPress: onBubblePress,
        show: showBubble
    } = useNewTransactionsBubble({
        listRef,
        topThreshold: 44
    });

    useHistoryPolling({ isEnabled: isFocused, onNewActivity: showBubble });

    const getItemType = useCallback((item: HistoryRowItem) => item.type, []);

    const rows = useMemo<HistoryRowItem[] | undefined>(
        () => groups && buildHistoryRows(groups, onNavigateToActivityItem),
        [groups, onNavigateToActivityItem]
    );

    const renderSeparator = useCallback(() => {
        return <View style={styles.separator} />;
    }, []);

    const renderItem = useCallback(({ item, index }: { item: HistoryRowItem; index: number }) => {
        switch (item.type) {
            case 'header':
                return (
                    <View
                        style={[
                            styles.sectionHeaderContainer,
                            index === 0 && styles.firstSectionHeaderContainer
                        ]}
                    >
                        <Text color="primary" variant="labelM" textTransform="capitalize">
                            {item.title}
                        </Text>
                    </View>
                );
            case 'activity':
                return <ActivityItem {...item.props} />;
        }
    }, []);

    if (!rows) {
        return (
            <List>
                <List.Title containerStyle={styles.titleContainer} skeleton />
                <List.Group style={styles.contentContainer} variant="separated">
                    <ActivityItemSkeleton />
                    <ActivityItemSkeleton />
                    <ActivityItemSkeleton />
                </List.Group>
            </List>
        );
    }

    if (rows.length === 0) {
        return <HistoryEmptyPlaceholder />;
    }

    return (
        <View style={styles.container}>
            <Screen.List
                ref={listRef}
                contentContainerStyle={styles.contentContainer}
                data={rows}
                keyExtractor={item => item.key}
                getItemType={getItemType}
                drawDistance={windowHeight * 4}
                maintainVisibleContentPosition={{ autoscrollToTopThreshold: 0 }}
                onEndReached={fetchNextPage}
                onEndReachedThreshold={0.5}
                ItemSeparatorComponent={renderSeparator}
                renderItem={renderItem}
                onScroll={scrollHandler}
                scrollEventThrottle={50}
            />
            <NewTransactionsBubble mode={bubbleMode} onPress={onBubblePress} />
        </View>
    );
};
