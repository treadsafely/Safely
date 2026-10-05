import { isIsoDate, readJsonFile } from './util.mjs';
import { isSeverity } from './severity.mjs';

export const VALID_CONTEXTS = ['runtime', 'rn-dev', 'build', 'dev', 'test'];
export const VALID_PATCHABLE = ['repo', 'resolutionStrategy', 'rn-upgrade', 'podfile'];
export const VALID_ECOSYSTEMS = ['Maven', 'CocoaPods'];

// An exception may say `"version": "*"` when the argument genuinely does not
// depend on the version. Nothing in the registry does today, and it has to be
// written out, because the failure mode of an *implicit* wildcard is an
// exception quietly following a coordinate across an SDK bump.
export const ANY_VERSION = '*';

// The threshold is a function of context, unlike the JavaScript gate. Measured
// reason: the high-severity findings in the declared graph sit in LogBox's
// development UI and in a test assertion library, while the two that ship inside
// the wallet's file-system path are moderate. A single global threshold gets that
// backwards. Overridable from the registry's own `policy` block, so tightening the
// gate is a reviewable diff there rather than a code change — and validated as
// strictly as an exception is, because a `blockingSeverities` that is a string
// instead of an array, or keyed by a context that does not exist, silently
// blocks nothing.
const DEFAULT_POLICY = {
    blockingSeverities: {
        runtime: ['critical', 'high', 'moderate'],
        'rn-dev': ['critical', 'high'],
        build: ['critical', 'high'],
        dev: ['critical'],
        test: ['critical']
    }
};

const normalizeId = value => (typeof value === 'string' ? value.trim().toUpperCase() : '');

// An exception is keyed by advisory, coordinate *and* version. Dropping the
// version is what lets an entry argued for `commons-io 1.4` go on excusing the
// same advisory on 2.0, where its reachability argument was never made — so the
// version is part of the identity, and a coordinate that moves reds the run as
// STALE instead.
const keyOf = (id, packageName, version) => `${normalizeId(id)}|${packageName}|${version}`;

// The same key without the version, for reporting *where* a stale entry's
// advisory went.
const coordinateKeyOf = (id, packageName) => `${normalizeId(id)}|${packageName}`;

const versionOf = exception =>
    typeof exception.version === 'string' && exception.version.trim()
        ? exception.version.trim()
        : ANY_VERSION;

export class AdvisoryRegistry {
    static load(path) {
        const parsed = readJsonFile(path, 'registry');
        return new AdvisoryRegistry(parsed);
    }

    constructor(raw = {}) {
        this.exceptions = raw.exceptions ?? [];
        this.policy = {
            ...DEFAULT_POLICY,
            ...(raw.policy ?? {}),
            blockingSeverities: {
                ...DEFAULT_POLICY.blockingSeverities,
                ...(raw.policy?.blockingSeverities ?? {})
            }
        };
        this.byKey = new Map(
            this.exceptions.map(exception => [this.keyOfException(exception), exception])
        );
    }

    validate() {
        const errors = [...this.#validatePolicy()];
        const seen = new Set();

        this.exceptions.forEach((exception, index) => {
            const where = `exceptions[${index}]${exception.id ? ` (${exception.id})` : ''}`;
            const check = (field, ok, message) => {
                if (!ok) errors.push(`${where}: ${field} ${message}`);
            };
            const filled = field =>
                typeof exception[field] === 'string' && exception[field].trim().length > 0;

            // The same key the matcher uses, so a pair the matcher cannot tell
            // apart is rejected here rather than silently collapsing into one
            // entry — with the other one never evaluated at all, expiry included.
            const key = this.keyOfException(exception);
            check('id', normalizeId(exception.id).length > 0, 'is required');
            check('id', !seen.has(key), 'is listed twice for the same coordinate and version');
            seen.add(key);

            const ecosystem = exception.ecosystem ?? 'Maven';
            check(
                'ecosystem',
                VALID_ECOSYSTEMS.includes(ecosystem),
                `must be one of ${VALID_ECOSYSTEMS.join(', ')}`
            );
            check(
                'package',
                filled('package') && (ecosystem !== 'Maven' || exception.package.includes(':')),
                ecosystem === 'Maven' ? 'must be a group:artifact coordinate' : 'must be a pod name'
            );
            // Required rather than defaulted: an entry with no version is an
            // exception for every version of the coordinate, which is a bigger
            // claim than any entry here makes, so it has to be spelled `*`.
            check(
                'version',
                filled('version'),
                `is required — the exact version argued for, or \`${ANY_VERSION}\` for a version-independent argument`
            );
            check('severity', isSeverity(exception.severity), 'must be a known severity');
            check(
                'context',
                VALID_CONTEXTS.includes(exception.context),
                `must be one of ${VALID_CONTEXTS.join(', ')}`
            );
            check(
                'patchable',
                exception.patchable === undefined || VALID_PATCHABLE.includes(exception.patchable),
                `must be one of ${VALID_PATCHABLE.join(', ')}`
            );
            check('rationale', filled('rationale'), 'is required');
            check('owner', filled('owner'), 'is required');
            check('expires', isIsoDate(exception.expires), 'must be a YYYY-MM-DD date');
        });

        return errors;
    }

    // A malformed policy is not a malformed comment: `{"runtime": "critical"}`
    // makes `includes` a substring test, and a context key with a typo in it is
    // read by nothing. Both leave the gate reporting a clean run.
    #validatePolicy() {
        const errors = [];
        const { blockingSeverities } = this.policy;

        if (
            !blockingSeverities ||
            typeof blockingSeverities !== 'object' ||
            Array.isArray(blockingSeverities)
        )
            return ['policy.blockingSeverities: must be an object keyed by context'];

        for (const [context, severities] of Object.entries(blockingSeverities)) {
            const where = `policy.blockingSeverities.${context}`;
            if (!VALID_CONTEXTS.includes(context)) {
                errors.push(`${where}: is not a known context (${VALID_CONTEXTS.join(', ')})`);
                continue;
            }
            if (!Array.isArray(severities)) {
                errors.push(`${where}: must be an array of severities`);
                continue;
            }
            const unknown = severities.filter(severity => !isSeverity(severity));
            if (unknown.length)
                errors.push(`${where}: ${unknown.map(String).join(', ')} is not a known severity`);
        }

        // Ties the context vocabulary to the thresholds: adding a context without
        // a threshold for it would otherwise fall back to `runtime` unnoticed.
        for (const context of VALID_CONTEXTS)
            if (!Object.hasOwn(blockingSeverities, context))
                errors.push(`policy.blockingSeverities.${context}: is missing`);

        return errors;
    }

    // No exception means no reviewed context, so the strictest one applies. The
    // lookup is by own property: a `graph` of `constructor` or `toString` coming
    // out of a graph file must not resolve to something with an `includes`.
    blocks(severity, context) {
        const { blockingSeverities } = this.policy;
        const severities = Object.hasOwn(blockingSeverities, context)
            ? blockingSeverities[context]
            : blockingSeverities.runtime;
        return severities.includes(severity);
    }

    // OSV keys the same advisory by GHSA and Sonatype by CVE, so an exception is
    // looked up by the finding's id *or* any of its aliases — and, for each of
    // those, by the finding's own version before the explicit `*` wildcard.
    find(finding) {
        const ids = [finding.id, ...(finding.aliases ?? [])];
        const keys = ids.flatMap(id => [
            keyOf(id, finding.name, finding.version),
            keyOf(id, finding.name, ANY_VERSION)
        ]);
        const key = keys.find(candidate => this.byKey.has(candidate)) ?? keys[0];
        return { key, exception: this.byKey.get(key) };
    }

    keyOfException(exception) {
        return keyOf(exception.id, exception.package, versionOf(exception));
    }

    coordinateKeyOfException(exception) {
        return coordinateKeyOf(exception.id, exception.package);
    }

    coordinateKeysOf(finding) {
        return [finding.id, ...(finding.aliases ?? [])].map(id =>
            coordinateKeyOf(id, finding.name)
        );
    }

    versionOfException(exception) {
        return versionOf(exception);
    }
}
