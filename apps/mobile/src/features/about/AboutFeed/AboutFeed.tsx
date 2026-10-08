import { useScrollToTop } from '@react-navigation/native';
import type { Ref } from 'react';
import { useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';

import type { AboutPost } from '@safely/core';
import { getGroupedRowType, type GroupedRow, useAboutQuery, useGroupedRows } from '@safely/ux';

import { Screen, Text } from '@mobile/shared/ui';
import type { ListRef } from '@mobile/shared/ui/Screen/components/List';

import { styles } from './AboutFeed.styles';
import { PostCard, AboutFeedSkeleton } from './components';

const DESC_ORDER = { order: 'desc' } as const;

export interface AboutFeedRef {
    scrollToTop: (latestTimestamp: number) => void;
}

export const AboutFeed = ({ ref }: { ref?: Ref<AboutFeedRef> }) => {
    const { data, isLoading } = useAboutQuery();
    const posts = data?.posts;
    const rows = useGroupedRows(
        posts ?? [],
        p => p.timestamp * 1000,
        p => p.id,
        DESC_ORDER
    );
    const listRef = useRef<ListRef<GroupedRow<AboutPost>>>(null);

    const pendingScrollTimestamp = useRef<number | null>(null);
    const latestTimestamp = posts?.at(-1)?.timestamp;

    const flushScrollToTop = () => {
        const pending = pendingScrollTimestamp.current;
        if (pending === null || latestTimestamp === undefined || latestTimestamp < pending) return;

        pendingScrollTimestamp.current = null;
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
    };

    useEffect(flushScrollToTop, [latestTimestamp]);

    useScrollToTop(listRef);
    useImperativeHandle(ref, () => ({
        scrollToTop: timestamp => {
            pendingScrollTimestamp.current = timestamp;
            flushScrollToTop();
        }
    }));

    const renderItem = ({ item }: { item: GroupedRow<AboutPost> }) => {
        if (item.type === 'header') {
            return (
                <Text variant="bodyM" color="tertiary" style={styles.sectionTitle}>
                    {item.title}
                </Text>
            );
        }

        return (
            <View style={styles.card}>
                <PostCard post={item.item} />
            </View>
        );
    };

    if (isLoading) {
        return <AboutFeedSkeleton />;
    }

    return (
        <Screen.List
            ref={listRef}
            data={rows}
            contentContainerStyle={styles.content}
            keyExtractor={item => item.key}
            getItemType={getGroupedRowType}
            renderItem={renderItem}
            maintainVisibleContentPosition={{ disabled: true }}
        />
    );
};
