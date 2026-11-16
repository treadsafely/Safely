import type { FC } from 'react';

import Flame32 from '@safely/ux/assets/icons/32/flame-32.svg?react';
import { cx } from '@safely/web-ui/styled-system/css';

import { blackStyles, brandStyles, rootStyles } from './FlameLogo.styles';
import { Icon } from '../../shared';

export type AssetLogoSize = 32 | 48 | 72;

export type FlameLogoProps = {
    size: AssetLogoSize;
    background?: 'brand' | 'black';
};

const ICON_SIZE: Record<AssetLogoSize, number> = { 32: 32, 48: 32, 72: 48 };

const BACKGROUND_STYLES = { brand: brandStyles, black: blackStyles };

export const FlameLogo: FC<FlameLogoProps> = props => {
    const { size, background = 'brand' } = props;

    return (
        <span
            className={cx(rootStyles, BACKGROUND_STYLES[background])}
            style={{ width: size, height: size }}
        >
            <Icon asset={Flame32} size={ICON_SIZE[size]} tone="constantWhite" aria-hidden />
        </span>
    );
};
