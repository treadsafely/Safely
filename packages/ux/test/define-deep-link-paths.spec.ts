import { describe, expect, it } from 'vitest';

import { defineDeepLinkPaths } from '../src/shared/linking/define-deep-link-paths';

describe('defineDeepLinkPaths', () => {
    const paths = defineDeepLinkPaths({
        tabs: {
            segment: 'tab',
            updates: 'updates',
            safety: { segment: 'safety', device: 'device' }
        },
        modal: 'import-wallet'
    });

    it('gives a leaf its segment and a path rooted at /', () => {
        expect(paths.modal).toEqual({ segment: 'import-wallet', path: '/import-wallet' });
    });

    it('makes a parent a route of its own that carries its children', () => {
        expect(paths.tabs.segment).toBe('tab');
        expect(paths.tabs.path).toBe('/tab');
        expect(paths.tabs.updates).toEqual({ segment: 'updates', path: '/tab/updates' });
    });

    it('composes a path from every ancestor', () => {
        expect(paths.tabs.safety.path).toBe('/tab/safety');
        expect(paths.tabs.safety.device).toEqual({ segment: 'device', path: '/tab/safety/device' });
    });

    it('does not turn `segment` into a child route', () => {
        expect(Object.keys(paths.tabs).sort()).toEqual(['path', 'safety', 'segment', 'updates']);
        // @ts-expect-error a leaf has no children
        expect(paths.modal.updates).toBeUndefined();
    });

    it('returns an empty tree for an empty definition', () => {
        expect(defineDeepLinkPaths({})).toEqual({});
    });

    it('leaves the definition untouched', () => {
        const tree = { tabs: { segment: 'tab', updates: 'updates' } };

        defineDeepLinkPaths(tree);

        expect(tree).toEqual({ tabs: { segment: 'tab', updates: 'updates' } });
    });
});
