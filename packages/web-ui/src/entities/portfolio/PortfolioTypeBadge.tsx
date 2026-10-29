import type { FC } from 'react';

import { PortfolioType } from '@safely/core';
import { useTranslate } from '@safely/ux';

import { Badge } from '../../shared';

type TypeBadge = {
    labelKey: string;
    tone?: 'purple';
};

const TYPE_BADGES: Partial<Record<PortfolioType, TypeBadge>> = {
    [PortfolioType.WATCH_ONLY]: { labelKey: 'portfolio.watchOnly' },
    [PortfolioType.LEDGER]: { labelKey: 'portfolio.ledger' },
    [PortfolioType.FLAME_DEVNET]: { labelKey: 'portfolio.flameDevnet', tone: 'purple' }
};

export type PortfolioTypeBadgeProps = {
    type: PortfolioType;
    tone?: 'neutral' | 'warning';
};

export const PortfolioTypeBadge: FC<PortfolioTypeBadgeProps> = props => {
    const { type, tone = 'neutral' } = props;

    const t = useTranslate();
    const typeBadge = TYPE_BADGES[type];

    if (!typeBadge) {
        return null;
    }

    return (
        <Badge tone={typeBadge.tone ?? tone} isUppercase>
            {t(typeBadge.labelKey)}
        </Badge>
    );
};
