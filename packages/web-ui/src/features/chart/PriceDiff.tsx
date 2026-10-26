import type { FC } from 'react';

import { SPACE } from '@safely/core';
import { useNumberFormatter } from '@safely/ux';

import { Text } from '../../shared';

export type PriceDiffProps = {
    priceDiff: number | null;
};

export const PriceDiff: FC<PriceDiffProps> = ({ priceDiff }) => {
    const formatter = useNumberFormatter();
    const isPositive = priceDiff !== null && priceDiff > 0;

    return (
        <Text variant="bodyM" isTabular tone={isPositive ? 'accentGreen' : 'accentRed'}>
            {priceDiff !== null ? formatter.formatPercent(priceDiff) : `−${SPACE.NNBSP}%`}
        </Text>
    );
};
