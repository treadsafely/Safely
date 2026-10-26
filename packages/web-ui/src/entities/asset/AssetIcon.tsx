import type { ComponentType, FC, SVGProps } from 'react';

import BtcLogo from '@safely/ux/assets/images/btc-logo.svg?react';

import { imageStyles } from './AssetIcon.styles';

/* `CryptoAsset.image` is a path into the app's own resources, mirrored by mobile's `resolveSource` */
const BUNDLED_IMAGES: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
    '/resources/images/btc-logo.svg': BtcLogo
};

const REMOTE_PROTOCOL = 'https://';

export type AssetIconProps = {
    image: string | undefined;
    size: number;
};

export const AssetIcon: FC<AssetIconProps> = props => {
    const { image, size } = props;

    const Bundled = image === undefined ? undefined : BUNDLED_IMAGES[image];

    if (Bundled !== undefined) {
        return <Bundled width={size} height={size} className={imageStyles} aria-hidden />;
    }

    if (image !== undefined && image.startsWith(REMOTE_PROTOCOL)) {
        return <img src={image} width={size} height={size} alt="" className={imageStyles} />;
    }

    return <span style={{ width: size, height: size }} className={imageStyles} />;
};
