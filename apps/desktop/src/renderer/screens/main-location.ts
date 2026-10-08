import type { MainLocation, MainView } from '@safely/web-ui';

import type { MainSearch, SettingsParams } from '../shared/routes';
import { ROUTE } from '../shared/routes';

type MainRoutePath =
    typeof ROUTE.main | typeof ROUTE.updates | typeof ROUTE.safety | typeof ROUTE.settings;

export type MainRouteMatch = {
    path: string;
    params: SettingsParams;
    search: MainSearch;
};

export type MainRouteTarget = {
    to: MainRoutePath;
    params: SettingsParams;
    search: MainSearch;
};

export function toMainLocation(match: MainRouteMatch): MainLocation {
    return { view: toMainView(match), modal: match.search.modal ?? null };
}

export function toMainRouteTarget(location: MainLocation): MainRouteTarget {
    const { view, modal } = location;
    const search: MainSearch = modal === null ? {} : { modal };

    switch (view.kind) {
        case 'home':
            return { to: ROUTE.main, params: {}, search };
        case 'updates':
            return { to: ROUTE.updates, params: {}, search };
        case 'safety':
            return { to: ROUTE.safety, params: {}, search };
        case 'settings':
            return {
                to: ROUTE.settings,
                /* default tanstack way to reset params */
                params: { section: view.section ?? undefined, tool: view.tool ?? undefined },
                search
            };
    }
}

function toMainView(match: MainRouteMatch): MainView {
    switch (match.path) {
        case ROUTE.main:
            return { kind: 'home' };
        case ROUTE.updates:
            return { kind: 'updates' };
        case ROUTE.safety:
            return { kind: 'safety' };
        case ROUTE.settings: {
            const section = match.params.section ?? null;

            return {
                kind: 'settings',
                section,
                tool: section === 'devTools' ? (match.params.tool ?? null) : null
            };
        }
        default:
            return { kind: 'home' };
    }
}
