import type { ComponentPropsWithoutRef, FC, ReactNode } from 'react';

import { cx } from '@safely/web-ui/styled-system/css';
import { pageHeader } from '@safely/web-ui/styled-system/recipes';

export type PageHeaderProps = Omit<ComponentPropsWithoutRef<'header'>, 'className' | 'title'> & {
    title: ReactNode;
    subtitle?: ReactNode;
    leading?: ReactNode;
    actions?: ReactNode;
    isCentered?: boolean;
    hasDivider?: boolean;
    className?: string;
};

export const PageHeader: FC<PageHeaderProps> = props => {
    const { title, subtitle, leading, actions, isCentered, hasDivider, className, ...rest } = props;
    const styles = pageHeader({ isCentered, hasDivider });

    return (
        <header className={cx(styles.root, className)} {...rest}>
            {leading !== undefined && <div className={styles.leading}>{leading}</div>}

            <div className={styles.titles}>
                <h1 className={styles.title}>{title}</h1>
                {subtitle !== undefined && <p className={styles.subtitle}>{subtitle}</p>}
            </div>

            {actions !== undefined && <div className={styles.actions}>{actions}</div>}
        </header>
    );
};
