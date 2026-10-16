import type { FC } from 'react';

import type { PortfolioMeta } from '@safely/core';

import { WalletIcon } from './WalletIcon';
import { rootStyles } from './WalletName.styles';
import { Text } from '../../shared';

export type WalletNameProps = {
    meta: PortfolioMeta;
};

export const WalletName: FC<WalletNameProps> = ({ meta }) => (
    <span className={rootStyles}>
        <WalletIcon icon={meta.icon} size="xsmall" />
        <Text variant="bodyM" isTruncated>
            {meta.name}
        </Text>
    </span>
);
