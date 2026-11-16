import type { FC } from 'react';

import { SPACE } from '@safely/core';
import { useNumberFormatter } from '@safely/ux';
import { cx } from '@safely/web-ui/styled-system/css';

import {
    diffBadgeFadedStyles,
    diffBadgeNegativeStyles,
    diffBadgePositiveStyles,
    diffBadgeStyles
} from './Chart.styles';

export type PriceDiffProps = {
    priceDiff: number | null;
    isFaded?: boolean;
};

export const PriceDiff: FC<PriceDiffProps> = props => {
    const { priceDiff, isFaded = false } = props;
    const formatter = useNumberFormatter();
    const isPositive = priceDiff !== null && priceDiff > 0;

    return (
        <span
            className={cx(
                diffBadgeStyles,
                isPositive ? diffBadgePositiveStyles : diffBadgeNegativeStyles,
                isFaded && diffBadgeFadedStyles
            )}
        >
            {priceDiff !== null ? formatter.formatPercent(priceDiff) : `−${SPACE.NNBSP}%`}
        </span>
    );
};
