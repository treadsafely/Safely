import type { ComponentType, FC, SVGProps } from 'react';

import { cx } from '@safely/web-ui/styled-system/css';
import type { IconRecipe } from '@safely/web-ui/styled-system/recipes';
import { icon } from '@safely/web-ui/styled-system/recipes';

import type { RecipeVariants } from '../recipe-variants';

export type IconAsset = ComponentType<SVGProps<SVGSVGElement>>;

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'className' | 'color' | 'ref'> &
    RecipeVariants<IconRecipe> & {
        asset: IconAsset;
        size?: number;
        className?: string;
    };

export const Icon: FC<IconProps> = props => {
    const { asset: Asset, size, tone, className, ...rest } = props;

    const assetSize = size === undefined ? {} : { width: size, height: size };

    return (
        <Asset
            {...assetSize}
            className={cx(icon({ tone }), className)}
            aria-hidden
            focusable="false"
            {...rest}
        />
    );
};
