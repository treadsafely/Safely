import type { FC } from 'react';

import type { PortfolioMetaIcon } from '@safely/core';

import { toWalletColorStyle } from './wallet-color';
import { colorStyles, emojiStyles } from './WalletIcon.styles';

export type WalletIconProps = {
    icon: PortfolioMetaIcon;
    size?: 'xsmall' | 'small' | 'medium' | 'large';
};

export const WalletIcon: FC<WalletIconProps> = props => {
    const { icon, size = 'small' } = props;

    if (icon.type === 'emoji') {
        return <span className={emojiStyles[size]}>{icon.value}</span>;
    }

    return <span className={colorStyles[size]} style={toWalletColorStyle(icon.value)} />;
};
