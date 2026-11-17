// The release scheme of .claude/rules/release.md as pure functions; git and the CLI are in index.mjs.

export const PLATFORMS = ['mobile', 'desktop'];

const VERSION = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseVersion(text) {
    const match = VERSION.exec(text ?? '');
    if (!match) return null;
    return match.slice(1).map(Number);
}

export function compareVersions(a, b) {
    const left = parseVersion(a);
    const right = parseVersion(b);
    for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] - right[i];
    return 0;
}

const minorOf = version => version.split('.').slice(0, 2).join('.');

export const tagOf = (platform, version) => `v${version}-${platform}`;

// Mobile tagged `v<x.y.z>` before the scheme; desktop has always been `v<x.y.z>-desktop`.
const TAG_PATTERNS = {
    mobile: [/^v(\d+\.\d+\.\d+)-mobile$/, /^v(\d+\.\d+\.\d+)$/],
    desktop: [/^v(\d+\.\d+\.\d+)-desktop$/]
};

export function releasedVersions(platform, tags) {
    const released = [];
    for (const tag of tags) {
        for (const pattern of TAG_PATTERNS[platform]) {
            const match = pattern.exec(tag);
            if (match) released.push({ tag, version: match[1] });
        }
    }
    return released.sort((a, b) => compareVersions(b.version, a.version));
}

// A branch the scheme does not name: no release, no tag, no deployment — unlike a broken release.
export class OutsideSchemeError extends Error {}

// `release/x.y.0` is shorthand for `release/mobile-x.y.0-desktop-x.y.0`, the only synchronous form.
export function parseBranch(branch) {
    const prefixed = /^(?:refs\/heads\/)?release\/(.+)$/.exec(branch);
    if (!prefixed) throw new OutsideSchemeError(`${branch} is not a release branch`);
    const name = prefixed[1];

    const synchronous = /^(\d+\.\d+\.\d+)$/.exec(name);
    if (synchronous) {
        const version = synchronous[1];
        if (parseVersion(version)[2] !== 0)
            throw new OutsideSchemeError(
                `${branch}: a synchronous release ends in .0; a patch belongs to one platform ` +
                    `(release/mobile-${version} or release/desktop-${version})`
            );
        return { mobile: version, desktop: version };
    }

    const single = /^(mobile|desktop)-(\d+\.\d+\.\d+)$/.exec(name);
    if (single) {
        const [, platform, version] = single;
        if (parseVersion(version)[2] === 0)
            throw new OutsideSchemeError(
                `${branch}: x.y.0 is a synchronous release of both platforms — release/${version}`
            );
        return { [platform]: version };
    }

    throw new OutsideSchemeError(
        `${branch} names no release: release/x.y.0, release/mobile-x.y.z or release/desktop-x.y.z`
    );
}

// head/base: { mobile, desktop } package.json versions; base is master before the merge.
export function checkRelease({ branch, head, base, tags, platform, allowReleased = false }) {
    const scope = parseBranch(branch);
    const errors = [];

    for (const p of PLATFORMS) {
        if (!parseVersion(head[p])) errors.push(`apps/${p}/package.json has no x.y.z version`);
        if (!parseVersion(base[p]))
            errors.push(`apps/${p}/package.json on the base has no x.y.z version`);
    }
    if (errors.length) return { scope, errors, outputs: {} };

    for (const p of PLATFORMS) {
        if (scope[p] && head[p] !== scope[p])
            errors.push(
                `${branch} releases ${p} ${scope[p]}, apps/${p}/package.json says ${head[p]}`
            );
        if (!scope[p] && head[p] !== base[p])
            errors.push(
                `${branch} does not release ${p}, yet changes its version ${base[p]} → ${head[p]}`
            );
    }

    const inScope = PLATFORMS.filter(p => scope[p]);
    if (inScope.length === 1) {
        const minor = minorOf(scope[inScope[0]]);
        const shared = PLATFORMS.map(p => minorOf(base[p]));
        if (shared.some(m => m !== minor))
            errors.push(
                `${branch}: a platform release stays in the minor both platforms share on master ` +
                    `(mobile ${base.mobile}, desktop ${base.desktop}); a new minor, or aligning ` +
                    `the platforms, is a synchronous release/x.y.0`
            );
    }

    const outputs = {};
    for (const p of PLATFORMS) outputs[p] = scope[p] ?? '';

    const checked = platform ? inScope.filter(p => p === platform) : inScope;
    for (const p of checked) {
        const released = releasedVersions(p, tags);
        const [latest] = released;
        const same = latest?.version === scope[p];
        if (latest && compareVersions(scope[p], latest.version) <= 0 && !(same && allowReleased)) {
            errors.push(
                `${p} ${scope[p]} is not newer than the released ${latest.tag}` +
                    (same ? ' — it is already out; bump the version' : '')
            );
            continue;
        }
        const previous = released.find(r => compareVersions(r.version, scope[p]) < 0);
        outputs[`${p}-tag`] = tagOf(p, scope[p]);
        outputs[`${p}-previous-tag`] = previous?.tag ?? '';
        outputs[`${p}-released`] = String(same);
    }

    return { scope, errors, outputs };
}
