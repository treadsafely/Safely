import type { ComponentPropsWithoutRef, FC, ReactNode } from 'react';

import ChevronRight16 from '@safely/ux/assets/icons/16/chevron-right-16.svg?react';
import Xmark16 from '@safely/ux/assets/icons/16/xmark-16.svg?react';
import { cx } from '@safely/web-ui/styled-system/css';
import { banner } from '@safely/web-ui/styled-system/recipes';

import type { BannerTone } from './BannerContext';
import { BannerContext, useBannerStyles } from './BannerContext';
import type { IconAsset } from '../Icon';
import { Icon } from '../Icon';

export type BannerRootProps = {
    tone?: BannerTone;
    onClick?: () => void;
    children?: ReactNode;
    className?: string;
};

export type BannerContentProps = Omit<ComponentPropsWithoutRef<'div'>, 'className'> & {
    className?: string;
};

export type BannerTextProps = Omit<ComponentPropsWithoutRef<'p'>, 'className'> & {
    className?: string;
};

export type BannerActionProps = Omit<ComponentPropsWithoutRef<'button'>, 'className'> & {
    className?: string;
};

export type BannerIconProps = {
    asset: IconAsset;
    className?: string;
};

export type BannerCloseProps = Omit<
    ComponentPropsWithoutRef<'button'>,
    'className' | 'children'
> & {
    label: string;
    className?: string;
};

const BannerRoot: FC<BannerRootProps> = props => {
    const { tone, onClick, className, children } = props;

    const styles = banner({ tone, isInteractive: Boolean(onClick) });
    const content = <BannerContext.Provider value={styles}>{children}</BannerContext.Provider>;

    if (!onClick) {
        return <div className={cx(styles.root, className)}>{content}</div>;
    }

    return (
        <button type="button" className={cx(styles.root, className)} onClick={onClick}>
            {content}
        </button>
    );
};

const BannerContent: FC<BannerContentProps> = props => {
    const { className, ...rest } = props;
    const styles = useBannerStyles();

    return <div className={cx(styles.content, className)} {...rest} />;
};

const BannerText: FC<BannerTextProps> = props => {
    const { className, ...rest } = props;
    const styles = useBannerStyles();

    return <p className={cx(styles.text, className)} {...rest} />;
};

const BannerAction: FC<BannerActionProps> = props => {
    const { className, children, ...rest } = props;
    const styles = useBannerStyles();

    return (
        <button type="button" className={cx(styles.action, className)} {...rest}>
            {children}
            <Icon asset={ChevronRight16} />
        </button>
    );
};

const BannerIcon: FC<BannerIconProps> = props => {
    const { asset, className } = props;
    const styles = useBannerStyles();

    return (
        <div className={cx(styles.icon, className)}>
            <Icon asset={asset} />
        </div>
    );
};

const BannerClose: FC<BannerCloseProps> = props => {
    const { label, className, ...rest } = props;
    const styles = useBannerStyles();

    return (
        <button type="button" className={cx(styles.close, className)} aria-label={label} {...rest}>
            <Icon asset={Xmark16} />
        </button>
    );
};

export const Banner = Object.assign(BannerRoot, {
    Content: BannerContent,
    Text: BannerText,
    Action: BannerAction,
    Icon: BannerIcon,
    Close: BannerClose
});
