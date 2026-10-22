import type { ComponentPropsWithoutRef, FC } from 'react';

import { cx } from '@safely/web-ui/styled-system/css';
import type { ToastRecipe } from '@safely/web-ui/styled-system/recipes';
import { toast } from '@safely/web-ui/styled-system/recipes';

import type { RecipeVariants } from '../recipe-variants';

type SharedElementProps = Omit<
    ComponentPropsWithoutRef<'div'> & ComponentPropsWithoutRef<'button'>,
    'className' | 'onClick' | 'type'
>;

export type ToastProps = SharedElementProps &
    RecipeVariants<ToastRecipe> & {
        message: string;
        className?: string;
        onClick?: () => void;
    };

export const Toast: FC<ToastProps> = props => {
    const { variant, message, className, onClick, ...rest } = props;

    const styles = cx(toast({ variant }), className);

    if (onClick !== undefined) {
        return (
            <button type="button" className={styles} onClick={onClick} {...rest}>
                {message}
            </button>
        );
    }

    return (
        <div className={styles} {...rest}>
            {message}
        </div>
    );
};
