import type { ComponentPropsWithoutRef, FC } from 'react';

import { cx } from '@safely/web-ui/styled-system/css';
import type { ColorDotRecipe } from '@safely/web-ui/styled-system/recipes';
import { colorDot } from '@safely/web-ui/styled-system/recipes';

import type { RecipeVariants } from '../recipe-variants';

export type ColorDotProps = Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'color'> &
    RecipeVariants<ColorDotRecipe> & {
        className?: string;
    };

export const ColorDot: FC<ColorDotProps> = props => {
    const { tone, size, className, ...rest } = props;

    return <span className={cx(colorDot({ tone, size }), className)} {...rest} />;
};
