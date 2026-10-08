import type { Route } from '@react-navigation/core';
import { NavigationRouteContext } from '@react-navigation/core';
import type { PropsWithChildren } from 'react';
import { useContext } from 'react';
import { View } from 'react-native';
import type { UnistylesVariants } from 'react-native-unistyles';

import { resolveLayoutByScreenName } from '@mobile/shared/utils';

import { ScreenContext, type ScreenContextType } from './Screen.context';
import { styles } from './Screen.styles';

type Layout = ScreenContextType['layout'];

function resolveLayout(layoutProp: Layout | undefined, route: Route<string> | undefined): Layout {
    if (layoutProp) {
        return layoutProp;
    }

    if (route === undefined) {
        return 'screen';
    }

    const routeLayout = (route.params as { layout?: Layout } | undefined)?.layout;

    return routeLayout ?? resolveLayoutByScreenName(route.name);
}

type ScreenContainerProps = {
    children: React.ReactNode;
    layout?: Layout;
} & UnistylesVariants<typeof styles>;

export function ScreenContainer(props: PropsWithChildren<ScreenContainerProps>) {
    const { children, background, layout: layoutProp } = props;

    const resolvedBackground = background ?? 'primary';

    const route = useContext(NavigationRouteContext);
    const layout = resolveLayout(layoutProp, route);

    styles.useVariants({ background: resolvedBackground });

    const content = <View style={styles.container}>{children}</View>;

    return (
        <ScreenContext.Provider
            value={{
                background: resolvedBackground,
                layout
            }}
        >
            {content}
        </ScreenContext.Provider>
    );
}
