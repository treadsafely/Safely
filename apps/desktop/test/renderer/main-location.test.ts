import { describe, expect, it } from 'vitest';

import type { MainLocation } from '@safely/web-ui';
import { DEV_TOOLS, MAIN_MODALS, SETTINGS_SECTIONS } from '@safely/web-ui';

import { toMainLocation, toMainRouteTarget } from '../../src/renderer/screens/main-location';

const views: MainLocation['view'][] = [
    { kind: 'home' },
    { kind: 'updates' },
    { kind: 'safety' },
    { kind: 'settings', section: null, tool: null },
    ...SETTINGS_SECTIONS.map(section => ({ kind: 'settings', section, tool: null }) as const),
    ...DEV_TOOLS.map(tool => ({ kind: 'settings', section: 'devTools', tool }) as const)
];

const modals: MainLocation['modal'][] = [null, ...MAIN_MODALS];

describe('main location', () => {
    it.each(views.flatMap(view => modals.map(modal => ({ view, modal }))))(
        'round-trips %j',
        location => {
            const { to, params, search } = toMainRouteTarget(location);

            expect(toMainLocation({ path: to, params, search })).toEqual(location);
        }
    );

    it('falls back to home for an unknown path', () => {
        expect(toMainLocation({ path: '/nope', params: {}, search: {} }).view).toEqual({
            kind: 'home'
        });
    });

    it('drops a tool segment under a section that has none', () => {
        expect(
            toMainLocation({
                path: '/settings/{-$section}/{-$tool}',
                params: { section: 'legal', tool: 'logs' },
                search: {}
            }).view
        ).toEqual({ kind: 'settings', section: 'legal', tool: null });
    });

    it('omits the modal from the search when none is open', () => {
        expect(toMainRouteTarget({ view: { kind: 'home' }, modal: null }).search).toEqual({});
    });
});
