import type { ComponentPropsWithoutRef, ElementType, FC } from 'react';

import { cx } from '@safely/web-ui/styled-system/css';
import type { TextRecipe } from '@safely/web-ui/styled-system/recipes';
import { text } from '@safely/web-ui/styled-system/recipes';

import type { RecipeVariants } from '../recipe-variants';

export type TextProps = Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'color'> &
    RecipeVariants<TextRecipe> & {
        as?: ElementType;
        className?: string;
    };

export const Text: FC<TextProps> = props => {
    const {
        as: Component = 'span',
        variant,
        tone,
        align,
        isTruncated,
        isTabular,
        className,
        ...rest
    } = props;

    return (
        <Component
            className={cx(text({ variant, tone, align, isTruncated, isTabular }), className)}
            {...rest}
        />
    );
};
