import type { FC } from 'react';

import { cx } from '@safely/web-ui/styled-system/css';

import {
    bubbleStyles,
    groupTitleStyles,
    scrollStyles,
    skeletonBubbleStyles
} from './UpdatesFeed.styles';
import { Skeleton } from '../../shared';

const LINE_HEIGHT = 20;
const LINE_WIDTHS = [240, 160];
const BUBBLES = ['first', 'second'];

export const UpdatesFeedSkeleton: FC = () => (
    <div className={scrollStyles}>
        <div className={groupTitleStyles}>
            <Skeleton width={60} height={LINE_HEIGHT} />
        </div>

        {BUBBLES.map(bubble => (
            <div key={bubble} className={cx(bubbleStyles, skeletonBubbleStyles)}>
                {LINE_WIDTHS.map(width => (
                    <Skeleton key={width} width={width} height={LINE_HEIGHT} />
                ))}
            </div>
        ))}
    </div>
);
