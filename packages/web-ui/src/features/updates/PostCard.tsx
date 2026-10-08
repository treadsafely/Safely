import type { FC } from 'react';

import type { AboutPost } from '@safely/core';
import { assertUnreachable } from '@safely/core';

import { ExternalLinkCard } from './ExternalLinkCard';
import { TaggedText } from './TaggedText';

export type PostCardProps = {
    post: AboutPost;
};

export const PostCard: FC<PostCardProps> = ({ post }) => {
    switch (post.type) {
        case 'taggedTextPost':
            return <TaggedText taggedText={post.tagged_text} links={post.links} />;
        case 'externalLinkPost':
            return <ExternalLinkCard {...post} />;
        default:
            return assertUnreachable(post);
    }
};
