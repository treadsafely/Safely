import { useScrollToTop } from '@react-navigation/native';
import type { ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { useWindowDimensions, View } from 'react-native';
import { useAnimatedScrollHandler } from 'react-native-reanimated';

import type { HistoryGroupView } from '@safely/ux';

import { ActivityItem, ActivityItemSkeleton } from '@mobile/entities/activity';
import { List, Screen, Text } from '@mobile/shared/ui';
import type { ListRef } from '@mobile/shared/ui/Screen/components/List';

import { HistoryEmptyPlaceholder } from '../HistoryEmptyPlaceholder';
import type { useNewTransactionsBubble } from './components';
import { NewTransactionsBubble } from './components';
import { styles } from './HistoryList.styles';
import type { HistoryScroll } from './hooks';
import { type HistoryRowItem, buildHistoryRows } from './utils/rows';

type HistoryListProps<TActivity> = {
    listRef: RefObject<ListRef<HistoryRowItem> | null>;
    bubble: ReturnType<typeof useNewTransactionsBubble>;
    scroll: HistoryScroll;
    header: ReactNode;
    groups: HistoryGroupView<TActivity>[] | undefined;
    fetchNextPage: () => unknown;
    onNavigateToActivityItem: (activity: TActivity) => void;
};

const HistoryListSkeleton = () => (
    <List>
        <List.Title containerStyle={styles.titleContainer} skeletonVariant="transparentElement" />
        <List.Group style={styles.row} variant="separated">
            <ActivityItemSkeleton />
            <ActivityItemSkeleton />
            <ActivityItemSkeleton />
        </List.Group>
    </List>
);

export const HistoryList = <TActivity,>(props: HistoryListProps<TActivity>) => {
    const { listRef, bubble, scroll, header, groups, fetchNextPage, onNavigateToActivityItem } =
        props;
    const windowHeight = useWindowDimensions().height;

    useScrollToTop(listRef);

    useEffect(() => {
        scroll.scrollY.value = 0;
    }, [scroll]);

    const scrollHandler = useAnimatedScrollHandler(event => {
        scroll.scrollY.value = event.contentOffset.y;
    });

    const onHeaderLayout = useCallback(
        (event: LayoutChangeEvent) => {
            scroll.listHeaderHeight.value = event.nativeEvent.layout.height;
        },
        [scroll.listHeaderHeight]
    );

    const getItemType = useCallback((item: HistoryRowItem) => item.type, []);

    const rows = useMemo(
        () => buildHistoryRows(groups, onNavigateToActivityItem),
        [groups, onNavigateToActivityItem]
    );

    const renderItem = useCallback(
        ({ item }: { item: HistoryRowItem }) => {
            switch (item.type) {
                case 'listHeader':
                    return <View onLayout={onHeaderLayout}>{header}</View>;
                case 'skeleton':
                    return <HistoryListSkeleton />;
                case 'empty':
                    return <HistoryEmptyPlaceholder />;
                case 'header':
                    return (
                        <View
                            style={[
                                styles.sectionHeaderContainer,
                                item.isFirst && styles.firstSectionHeaderContainer
                            ]}
                        >
                            <Text color="primary" variant="labelM" textTransform="capitalize">
                                {item.title}
                            </Text>
                        </View>
                    );
                case 'activity':
                    return (
                        <View style={styles.row}>
                            <ActivityItem {...item.props} />
                        </View>
                    );
            }
        },
        [header, onHeaderLayout]
    );

    return (
        <View style={styles.container}>
            <Screen.List
                ref={listRef}
                data={rows}
                keyExtractor={item => item.key}
                getItemType={getItemType}
                drawDistance={windowHeight * 4}
                onEndReached={fetchNextPage}
                onEndReachedThreshold={0.5}
                renderItem={renderItem}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
            />
            <NewTransactionsBubble mode={bubble.mode} onPress={bubble.onPress} />
        </View>
    );
};
