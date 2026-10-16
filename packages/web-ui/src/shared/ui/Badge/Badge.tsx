import type { ComponentPropsWithoutRef, FC } from 'react';

import { cx } from '@safely/web-ui/styled-system/css';
import type { BadgeRecipe } from '@safely/web-ui/styled-system/recipes';
import { badge } from '@safely/web-ui/styled-system/recipes';

import type { RecipeVariants } from '../recipe-variants';

export type BadgeProps = Omit<ComponentPropsWithoutRef<'span'>, 'className'> &
    RecipeVariants<BadgeRecipe> & {
        className?: string;
    };

export const Badge: FC<BadgeProps> = props => {
    const { tone, isUppercase, className, ...rest } = props;

    return <span className={cx(badge({ tone, isUppercase }), className)} {...rest} />;
};
