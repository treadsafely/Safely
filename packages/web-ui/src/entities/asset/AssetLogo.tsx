import type { FC } from 'react';

import type { CryptoAsset } from '@safely/core';
import { FLAME_ASSET } from '@safely/core';

import { AssetIcon } from './AssetIcon';
import type { AssetLogoSize } from './FlameLogo';
import { FlameLogo } from './FlameLogo';

export type AssetLogoProps = {
    asset: CryptoAsset;
    size: AssetLogoSize;
};

export const AssetLogo: FC<AssetLogoProps> = props => {
    const { asset, size } = props;

    if (asset.id.isEq(FLAME_ASSET.id)) {
        return <FlameLogo size={size} />;
    }

    return <AssetIcon image={asset.image} size={size} />;
};
