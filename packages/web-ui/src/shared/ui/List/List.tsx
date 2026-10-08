import type { ComponentPropsWithoutRef, FC } from 'react';

import { cx } from '@safely/web-ui/styled-system/css';
import type { ListRecipe } from '@safely/web-ui/styled-system/recipes';
import { list } from '@safely/web-ui/styled-system/recipes';

import type { RecipeVariants } from '../recipe-variants';

export type ListRootProps = Omit<ComponentPropsWithoutRef<'section'>, 'className'> & {
    className?: string;
};

export type ListTitleProps = Omit<ComponentPropsWithoutRef<'h2'>, 'className'> & {
    variant?: RecipeVariants<ListRecipe>['titleVariant'];
    className?: string;
};

export type ListGroupProps = Omit<ComponentPropsWithoutRef<'div'>, 'className'> &
    RecipeVariants<ListRecipe> & {
        className?: string;
    };

export type ListFooterProps = Omit<ComponentPropsWithoutRef<'p'>, 'className'> & {
    className?: string;
};

const ListRoot: FC<ListRootProps> = props => {
    const { className, ...rest } = props;

    return <section className={cx(list().root, className)} {...rest} />;
};

const ListTitle: FC<ListTitleProps> = props => {
    const { variant, className, ...rest } = props;

    return <h2 className={cx(list({ titleVariant: variant }).title, className)} {...rest} />;
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
