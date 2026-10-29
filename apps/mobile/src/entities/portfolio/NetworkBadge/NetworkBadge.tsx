import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import type { PortfolioNetworkBadge } from '@safely/ux';

import { Badge } from '@mobile/shared/ui';

type BadgeType = NonNullable<ComponentProps<typeof Badge>['type']>;

type NetworkBadgeProps = {
    badge: PortfolioNetworkBadge;
    neutralType?: BadgeType;
};

export const NetworkBadge = (props: NetworkBadgeProps) => {
    const { badge, neutralType = 'neutral' } = props;
    const { t } = useTranslation();

    return (
        <Badge type={badge.tone === 'neutral' ? neutralType : badge.tone} isUppercase>
            {t(badge.labelKey)}
        </Badge>
    );
};
