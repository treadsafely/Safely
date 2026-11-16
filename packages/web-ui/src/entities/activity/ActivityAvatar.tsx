import type { FC } from 'react';

import type { CryptoAsset } from '@safely/core';
import ArrowDown16 from '@safely/ux/assets/icons/16/arrow-down-16.svg?react';
import ArrowTop16 from '@safely/ux/assets/icons/16/arrow-top-16.svg?react';

import { badgeStyles, rootStyles } from './ActivityAvatar.styles';
import { Icon } from '../../shared';
import { AssetLogo } from '../asset';

const ASSET_ICON_SIZE = 72;

export type ActivityAvatarProps = {
    asset: CryptoAsset;
    isInitiator: boolean;
};

export const ActivityAvatar: FC<ActivityAvatarProps> = props => {
    const { asset, isInitiator } = props;

    return (
        <span className={rootStyles}>
            <AssetLogo asset={asset} size={ASSET_ICON_SIZE} />
            <span className={badgeStyles}>
                <Icon asset={isInitiator ? ArrowTop16 : ArrowDown16} tone="primary" />
            </span>
        </span>
    );
};
