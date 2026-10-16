import type { FC } from 'react';
import { useEffect, useRef } from 'react';

import type { AboutPost } from '@safely/core';
import { useAboutQuery, useGroupedRows } from '@safely/ux';

import { PostCard } from './PostCard';
import { bubbleStyles, groupTitleStyles, scrollStyles } from './UpdatesFeed.styles';
import { UpdatesFeedSkeleton } from './UpdatesFeedSkeleton';
import { Text } from '../../shared';

const getKey = (post: AboutPost): string => post.id;
const getTimestamp = (post: AboutPost): number => post.timestamp * 1000;

export const UpdatesFeed: FC = () => {
    const { data, isLoading } = useAboutQuery();
    const rows = useGroupedRows(data?.posts ?? [], getTimestamp, getKey);

    const scroll = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = scroll.current;

        if (element !== null) {
            element.scrollTop = element.scrollHeight;
        }
    }, [rows]);

    if (isLoading) {
        return <UpdatesFeedSkeleton />;
    }

    return (
        <div ref={scroll} className={scrollStyles}>
            {rows.map(row =>
                row.type === 'header' ? (
                    <Text
                        key={row.key}
                        variant="bodyM"
                        tone="tertiary"
                        className={groupTitleStyles}
                    >
                        {row.title}
                    </Text>
                ) : (
                    <div key={row.key} className={bubbleStyles}>
                        <PostCard post={row.item} />
                    </div>
                )
            )}
        </div>
    );
};
