import type { FC } from 'react';

import { PortfolioType } from '@safely/core';
import { useTranslate } from '@safely/ux';

import { Badge } from '../../shared';

const LABEL_KEYS = {
    [PortfolioType.WATCH_ONLY]: 'portfolio.watchOnly',
    [PortfolioType.LEDGER]: 'portfolio.ledger'
} as const;

export type PortfolioTypeBadgeProps = {
    type: PortfolioType;
    tone?: 'neutral' | 'warning';
};

export const PortfolioTypeBadge: FC<PortfolioTypeBadgeProps> = props => {
    const { type, tone = 'neutral' } = props;

    const t = useTranslate();

    if (type === PortfolioType.BIP39) {
        return null;
    }

    return (
        <Badge tone={tone} isUppercase>
            {t(LABEL_KEYS[type])}
        </Badge>
    );
};
