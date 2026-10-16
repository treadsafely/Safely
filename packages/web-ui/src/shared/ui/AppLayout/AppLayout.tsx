import type { ComponentPropsWithoutRef, FC, ReactNode } from 'react';
import { createContext, useContext } from 'react';

import { cx } from '@safely/web-ui/styled-system/css';
import { appLayout } from '@safely/web-ui/styled-system/recipes';

export type AppLayoutRootProps = {
    hasWindowControls?: boolean;
    isFullScreen?: boolean;
    isSecondaryOpen?: boolean;
    isPanelOpen?: boolean;
    children?: ReactNode;
    className?: string;
};

type AppLayoutPartProps = Omit<ComponentPropsWithoutRef<'div'>, 'className'> & {
    className?: string;
};

const AppLayoutContext = createContext(appLayout());

const useAppLayoutStyles = () => useContext(AppLayoutContext);

const AppLayoutRoot: FC<AppLayoutRootProps> = props => {
    const { hasWindowControls, isFullScreen, isSecondaryOpen, isPanelOpen, className, children } =
        props;

    const styles = appLayout({ hasWindowControls, isFullScreen, isSecondaryOpen, isPanelOpen });

    return (
        <div className={cx(styles.root, className)}>
            <AppLayoutContext.Provider value={styles}>{children}</AppLayoutContext.Provider>
        </div>
    );
};

const AppLayoutTitleBar: FC<AppLayoutPartProps> = props => {
    const { className, ...rest } = props;

    return <div className={cx(useAppLayoutStyles().titleBar, className)} {...rest} />;
};

const AppLayoutSidebar: FC<AppLayoutPartProps> = props => {
    const { className, ...rest } = props;

    return <aside className={cx(useAppLayoutStyles().sidebar, className)} {...rest} />;
};

const AppLayoutSecondary: FC<AppLayoutPartProps> = props => {
    const { className, ...rest } = props;

    return <aside className={cx(useAppLayoutStyles().secondary, className)} {...rest} />;
};

const AppLayoutSecondaryContent: FC<AppLayoutPartProps> = props => {
    const { className, ...rest } = props;

    return <div className={cx(useAppLayoutStyles().secondaryContent, className)} {...rest} />;
};

const AppLayoutContent: FC<AppLayoutPartProps> = props => {
    const { className, ...rest } = props;

    return <main className={cx(useAppLayoutStyles().content, className)} {...rest} />;
};

const AppLayoutPanel: FC<AppLayoutPartProps> = props => {
    const { className, ...rest } = props;

    return <aside className={cx(useAppLayoutStyles().panel, className)} {...rest} />;
};

const AppLayoutPanelContent: FC<AppLayoutPartProps> = props => {
    const { className, ...rest } = props;

    return <div className={cx(useAppLayoutStyles().panelContent, className)} {...rest} />;
};

export const AppLayout = Object.assign(AppLayoutRoot, {
    TitleBar: AppLayoutTitleBar,
    Sidebar: AppLayoutSidebar,
    Secondary: AppLayoutSecondary,
    SecondaryContent: AppLayoutSecondaryContent,
    Content: AppLayoutContent,
    Panel: AppLayoutPanel,
    PanelContent: AppLayoutPanelContent
});
