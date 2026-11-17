import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    checkRelease,
    OutsideSchemeError,
    parseBranch,
    releasedVersions
} from './release-scheme.mjs';

const TAGS = ['v1.3.2', 'v1.0.901', 'v1.0.0-desktop', 'v1.2.6'];
const aligned = { mobile: '1.4.0', desktop: '1.4.0' };

const check = overrides => checkRelease({ head: aligned, base: aligned, tags: TAGS, ...overrides });

describe('parseBranch', () => {
    it('reads a synchronous release as both platforms', () => {
        assert.deepEqual(parseBranch('release/1.5.0'), { mobile: '1.5.0', desktop: '1.5.0' });
    });

    it('reads a platform release', () => {
        assert.deepEqual(parseBranch('release/mobile-1.4.1'), { mobile: '1.4.1' });
        assert.deepEqual(parseBranch('refs/heads/release/desktop-1.4.2'), { desktop: '1.4.2' });
    });

    it('refuses a synchronous patch and a platform x.y.0', () => {
        assert.throws(() => parseBranch('release/1.4.1'), /ends in \.0/);
        assert.throws(() => parseBranch('release/mobile-1.5.0'), /synchronous/);
    });

    it('refuses names outside the scheme', () => {
        for (const name of ['release/desktop', 'release/mobile/1.4.1', 'release/1.4', 'fix/x'])
            assert.throws(() => parseBranch(name), OutsideSchemeError);
    });
});

describe('releasedVersions', () => {
    it('counts the pre-scheme mobile tags as mobile', () => {
        const tags = ['v1.3.2', 'v1.4.0-mobile', 'v1.4.0-desktop'];
        assert.deepEqual(
            releasedVersions('mobile', tags).map(r => r.tag),
            ['v1.4.0-mobile', 'v1.3.2']
        );
        assert.deepEqual(
            releasedVersions('desktop', tags).map(r => r.tag),
            ['v1.4.0-desktop']
        );
    });
});

describe('checkRelease', () => {
    it('aligns desktop with the first synchronous release', () => {
        const result = check({
            branch: 'release/1.4.0',
            base: { mobile: '1.4.0', desktop: '1.0.0' }
        });
        assert.deepEqual(result.errors, []);
        assert.deepEqual(result.outputs, {
            mobile: '1.4.0',
            desktop: '1.4.0',
            'mobile-tag': 'v1.4.0-mobile',
            'mobile-previous-tag': 'v1.3.2',
            'mobile-released': 'false',
            'desktop-tag': 'v1.4.0-desktop',
            'desktop-previous-tag': 'v1.0.0-desktop',
            'desktop-released': 'false'
        });
    });

    it('releases one platform inside the shared minor', () => {
        const result = check({
            branch: 'release/mobile-1.4.1',
            head: { mobile: '1.4.1', desktop: '1.4.0' },
            tags: [...TAGS, 'v1.4.0-mobile', 'v1.4.0-desktop']
        });
        assert.deepEqual(result.errors, []);
        assert.equal(result.outputs.desktop, '');
        assert.equal(result.outputs['mobile-previous-tag'], 'v1.4.0-mobile');
    });

    it('refuses a platform release before the platforms share a minor', () => {
        const result = check({
            branch: 'release/mobile-1.4.1',
            head: { mobile: '1.4.1', desktop: '1.0.0' },
            base: { mobile: '1.4.0', desktop: '1.0.0' }
        });
        assert.match(result.errors.join(), /shared minor|share on master/);
    });

    it('refuses a branch that disagrees with package.json', () => {
        const result = check({ branch: 'release/1.5.0' });
        assert.equal(result.errors.length, 2);
    });

    it('refuses a platform release that moves the other version', () => {
        const result = check({
            branch: 'release/desktop-1.4.1',
            head: { mobile: '1.4.1', desktop: '1.4.1' }
        });
        assert.match(result.errors.join(), /does not release mobile/);
    });

    it('refuses a version that is already released', () => {
        const result = check({ branch: 'release/1.4.0', tags: [...TAGS, 'v1.4.0'] });
        assert.match(result.errors.join(), /already out/);
    });

    it('checks only the platform it is asked about', () => {
        const result = check({
            branch: 'release/1.4.0',
            tags: [...TAGS, 'v1.4.0-desktop'],
            platform: 'mobile'
        });
        assert.deepEqual(result.errors, []);
        assert.equal(result.outputs['desktop-tag'], undefined);
        assert.equal(result.outputs['mobile-tag'], 'v1.4.0-mobile');
    });

    it('reports a re-run after publishing instead of failing it', () => {
        const result = check({
            branch: 'release/1.4.0',
            tags: [...TAGS, 'v1.4.0-mobile'],
            platform: 'mobile',
            allowReleased: true
        });
        assert.deepEqual(result.errors, []);
        assert.equal(result.outputs['mobile-released'], 'true');
        assert.equal(result.outputs['mobile-previous-tag'], 'v1.3.2');
    });

    it('still refuses an older version on a re-run', () => {
        const result = check({
            branch: 'release/1.4.0',
            tags: [...TAGS, 'v1.5.0-mobile'],
            platform: 'mobile',
            allowReleased: true
        });
        assert.match(result.errors.join(), /not newer/);
    });
});
