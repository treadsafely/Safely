import type { ComponentPropsWithoutRef, FC, KeyboardEvent } from 'react';

import { cx } from '@safely/web-ui/styled-system/css';
import type { ListRecipe } from '@safely/web-ui/styled-system/recipes';
import { list } from '@safely/web-ui/styled-system/recipes';

import type { RecipeVariants } from '../recipe-variants';

export type ListRootProps = Omit<ComponentPropsWithoutRef<'section'>, 'className'> & {
    className?: string;
};

export type ListTitleProps = Omit<ComponentPropsWithoutRef<'h2'>, 'className'> & {
    variant?: RecipeVariants<ListRecipe>['titleVariant'];
    size?: RecipeVariants<ListRecipe>['size'];
    className?: string;
};

export type ListGroupProps = Omit<ComponentPropsWithoutRef<'div'>, 'className'> &
    RecipeVariants<ListRecipe> & {
        className?: string;
    };

export type ListFooterProps = Omit<ComponentPropsWithoutRef<'p'>, 'className'> & {
    className?: string;
};

const FOCUSABLE_SELECTOR = 'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';

const NEXT_INDEX: Partial<Record<string, (index: number, last: number) => number>> = {
    ArrowDown: (index, last) => Math.min(index + 1, last),
    ArrowUp: index => Math.max(index - 1, 0),
    Home: () => 0,
    End: (_index, last) => last
};

function moveFocus(event: KeyboardEvent<HTMLElement>): void {
    const nextIndex = NEXT_INDEX[event.key];
    const isTyping =
        event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;

    if (nextIndex === undefined || event.defaultPrevented || isTyping) {
        return;
    }

    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    const index = items.findIndex(item => item === document.activeElement);

    if (index === -1) {
        return;
    }

    event.preventDefault();
    items[nextIndex(index, items.length - 1)]?.focus();
}

const ListRoot: FC<ListRootProps> = props => {
    const { className, ...rest } = props;

    return <section className={cx(list().root, className)} onKeyDown={moveFocus} {...rest} />;
};

const ListTitle: FC<ListTitleProps> = props => {
    const { variant, size, className, ...rest } = props;

    return <h2 className={cx(list({ titleVariant: variant, size }).title, className)} {...rest} />;
};

const ListGroup: FC<ListGroupProps> = props => {
    const { variant, className, ...rest } = props;

    return <div className={cx(list({ variant }).group, className)} {...rest} />;
};

const ListFooter: FC<ListFooterProps> = props => {
    const { className, ...rest } = props;

    return <p className={cx(list().footer, className)} {...rest} />;
};

export const List = Object.assign(ListRoot, {
    Title: ListTitle,
    Group: ListGroup,
    Footer: ListFooter
});
