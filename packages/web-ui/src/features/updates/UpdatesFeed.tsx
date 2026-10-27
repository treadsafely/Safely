import type { FC } from 'react';

import { useAboutFeedRows } from '@safely/ux';

import { PostCard } from './PostCard';
import { bubbleStyles, groupTitleStyles, scrollStyles } from './UpdatesFeed.styles';
import { UpdatesFeedSkeleton } from './UpdatesFeedSkeleton';
import { Text } from '../../shared';

export const UpdatesFeed: FC = () => {
    const { rows, isLoading } = useAboutFeedRows();

    if (isLoading) {
        return <UpdatesFeedSkeleton />;
    }

    return (
        <div className={scrollStyles}>
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
