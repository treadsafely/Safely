import type { ComponentPropsWithoutRef, FC } from 'react';

import { cx } from '@safely/web-ui/styled-system/css';
import type { ToastRecipe } from '@safely/web-ui/styled-system/recipes';
import { toast } from '@safely/web-ui/styled-system/recipes';

import type { RecipeVariants } from '../recipe-variants';

export type ToastProps = Omit<ComponentPropsWithoutRef<'div'>, 'className'> &
    RecipeVariants<ToastRecipe> & {
        message: string;
        className?: string;
    };

export const Toast: FC<ToastProps> = props => {
    const { variant, message, className, ...rest } = props;

    return (
        <div className={cx(toast({ variant }), className)} {...rest}>
            {message}
        </div>
    );
};
