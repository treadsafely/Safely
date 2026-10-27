import type { CryptoAsset } from '@safely/core';
import { FLAME_ASSET } from '@safely/core';

import { Image } from '@mobile/shared/ui';

import { styles } from './AssetLogo.styles';
import { FlameLogo } from './FlameLogo';

type AssetLogoProps = {
    asset: CryptoAsset;
    size?: 'medium' | 'large' | 'xlarge';
};

export const AssetLogo = (props: AssetLogoProps) => {
    const { asset, size = 'medium' } = props;

    styles.useVariants({ size });

    if (asset.id.isEq(FLAME_ASSET.id)) {
        return <FlameLogo size={size} />;
    }

    return asset.image ? <Image source={asset.image} style={styles.image} /> : null;
};
