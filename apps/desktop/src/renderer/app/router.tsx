import {
    createMemoryHistory,
    createRootRouteWithContext,
    createRoute,
    createRouter
} from '@tanstack/react-router';

import { OnboardingGuard } from './OnboardingGuard';
import { MainScreen, WelcomeScreen } from '../screens';
import { ROUTE, sMainSearch, sSettingsParams } from '../shared';

export type RouterContext = {
    hasWindowControls?: boolean;
    isFullScreen?: boolean;
};

const rootRoute = createRootRouteWithContext<RouterContext>()({ component: OnboardingGuard });

const mainLayoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: 'main',
    component: MainScreen,
    validateSearch: sMainSearch
});

const homeRoute = createRoute({ getParentRoute: () => mainLayoutRoute, path: ROUTE.main });

const updatesRoute = createRoute({ getParentRoute: () => mainLayoutRoute, path: ROUTE.updates });

const safetyRoute = createRoute({ getParentRoute: () => mainLayoutRoute, path: ROUTE.safety });

const settingsRoute = createRoute({
    getParentRoute: () => mainLayoutRoute,
    path: ROUTE.settings,
    params: {
        parse: params => sSettingsParams.parse(params),
        stringify: params => params
    }
});

const welcomeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: ROUTE.onboarding.welcome,
    component: WelcomeScreen
});

const routeTree = rootRoute.addChildren([
    mainLayoutRoute.addChildren([homeRoute, updatesRoute, safetyRoute, settingsRoute]),
    welcomeRoute
]);

export const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [ROUTE.main] }),
    context: {} as RouterContext
});

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}
