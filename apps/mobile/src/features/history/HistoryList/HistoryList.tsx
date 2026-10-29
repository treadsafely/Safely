import { useScrollToTop } from '@react-navigation/native';
import type { RefObject } from 'react';
import { useCallback, useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';

import type { HistoryGroupView } from '@safely/ux';

import { ActivityItem, ActivityItemSkeleton } from '@mobile/entities/activity';
import { List, Screen, Text } from '@mobile/shared/ui';
import type { ListRef } from '@mobile/shared/ui/Screen/components/List';

import { HistoryEmptyPlaceholder } from '../HistoryEmptyPlaceholder';
import type { useNewTransactionsBubble } from './components';
import { NewTransactionsBubble } from './components';
import { styles } from './HistoryList.styles';
import { type HistoryRowItem, buildHistoryRows } from './utils/rows';

type HistoryListProps<TActivity> = {
    listRef: RefObject<ListRef<HistoryRowItem> | null>;
    bubble: ReturnType<typeof useNewTransactionsBubble>;
    groups: HistoryGroupView<TActivity>[] | undefined;
    fetchNextPage: () => unknown;
    onNavigateToActivityItem: (activity: TActivity) => void;
};

export const HistoryList = <TActivity,>(props: HistoryListProps<TActivity>) => {
    const { listRef, bubble, groups, fetchNextPage, onNavigateToActivityItem } = props;
    const windowHeight = useWindowDimensions().height;

    useScrollToTop(listRef);

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
                <List.Title
                    containerStyle={styles.titleContainer}
                    skeletonVariant="transparentElement"
                />
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
                onScroll={bubble.scrollHandler}
                scrollEventThrottle={50}
            />
            <NewTransactionsBubble mode={bubble.mode} onPress={bubble.onPress} />
        </View>
    );
};
