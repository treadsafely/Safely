import type { CSSProperties, FC } from 'react';

import { cx } from '@safely/web-ui/styled-system/css';

import { skeletonStyles } from './Skeleton.styles';

export type SkeletonProps = {
    width: number;
    height: number;
    className?: string;
};

const toSizeStyle = (width: number, height: number): CSSProperties =>
    ({ '--skeleton-width': `${width}px`, '--skeleton-height': `${height}px` }) as CSSProperties;

export const Skeleton: FC<SkeletonProps> = props => {
    const { width, height, className } = props;

    return <span className={cx(skeletonStyles, className)} style={toSizeStyle(width, height)} />;
};
