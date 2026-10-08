import { Button as BaseUiButton } from '@base-ui/react/button';
import type { ComponentPropsWithoutRef, FC, ReactNode } from 'react';

import { css, cx } from '@safely/web-ui/styled-system/css';
import type { ButtonRecipe } from '@safely/web-ui/styled-system/recipes';
import { button } from '@safely/web-ui/styled-system/recipes';

import type { RecipeVariants } from '../recipe-variants';
import { Spinner } from '../Spinner';

export type ButtonProps = Omit<ComponentPropsWithoutRef<typeof BaseUiButton>, 'className'> &
    RecipeVariants<ButtonRecipe> & {
        iconLeft?: ReactNode;
        iconRight?: ReactNode;
        /**
         * Base UI also accepts a `(state) => string` callback, which Panda cannot extract —
         * hence a plain string. Style state through the declared conditions instead.
         */
        className?: string;
    };

const SPINNER_SIZE_BY_SIZE = {
    xsmall: 20,
    small: 20,
    medium: 24,
    large: 28
};

const contentStyles = css({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'inherit'
});

const hiddenContentStyles = css({ visibility: 'hidden' });

const loaderStyles = css({
    position: 'absolute',
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
});

/* A recipe class name rather than a `styled()` wrapper: without `shouldForwardProp` a wrapper
   leaks style props into the DOM. */
export const Button: FC<ButtonProps> = props => {
    const {
        variant,
        size = 'large',
        isFullWidth,
        isIconOnly,
        isRound,
        isLoading,
        iconLeft,
        iconRight,
        disabled,
        className,
        children,
        ...rest
    } = props;

    const hasContent = Boolean(iconLeft || children || iconRight);

    return (
        <BaseUiButton
            className={cx(
                button({ variant, size, isFullWidth, isIconOnly, isRound, isLoading }),
                className
            )}
            disabled={disabled || isLoading}
            {...rest}
        >
            {hasContent && (
                <span className={cx(contentStyles, isLoading && hiddenContentStyles)}>
                    {iconLeft}
                    {children}
                    {iconRight}
                </span>
            )}

            {isLoading && (
                <span className={loaderStyles}>
                    <Spinner size={SPINNER_SIZE_BY_SIZE[size]} />
                </span>
            )}
        </BaseUiButton>
    );
};
