import { rankOf } from './severity.mjs';
import { daysBetween } from './util.mjs';

export const KIND_LABEL = {
    unreviewed: 'NEW',
    expired: 'EXPIRED',
    'severity-increased': 'ESCALATED',
    'context-mismatch': 'CONTEXT',
    stale: 'STALE'
};

export class GateEvaluator {
    constructor(registry, { today = new Date() } = {}) {
        this.registry = registry;
        this.today = today;
    }

    evaluate(findings) {
        const violations = [];
        const warnings = [];
        const accepted = [];
        const informational = [];
        const matched = new Set();
        // Which versions of a coordinate an advisory reaches, so a STALE entry can
        // say whether the advisory left the graph or only moved to a version its
        // argument was never made for.
        const versionsSeen = new Map();
        const push = (entry, blocking) => (blocking ? violations : warnings).push(entry);

        for (const finding of findings) {
            for (const key of this.registry.coordinateKeysOf(finding)) {
                if (!versionsSeen.has(key)) versionsSeen.set(key, new Set());
                versionsSeen.get(key).add(finding.version);
            }

            const { key, exception } = this.registry.find(finding);

            if (!exception) {
                // The declared collector labels a coordinate from the
                // configuration that declares it and nothing more, so `rn-dev` is
                // a claim only a reviewed entry can make; everything else falls
                // back to the strictest threshold via `blocks`.
                if (this.registry.blocks(finding.severity, finding.graph)) {
                    violations.push({
                        kind: 'unreviewed',
                        finding,
                        detail: 'no reviewed exception in the registry'
                    });
                } else {
                    informational.push({ finding });
                }
                continue;
            }

            matched.add(key);
            const daysLeft = daysBetween(this.today, new Date(exception.expires));
            const escalated = rankOf(finding.severity) > rankOf(exception.severity);
            // Every `graph` value is backed by a Gradle configuration name, so a
            // `dev` or `test` claim against a runtime one is a real contradiction,
            // not a guess.
            const contextMismatch =
                finding.graph === 'runtime' && ['dev', 'test'].includes(exception.context);

            if (daysLeft < 0) {
                violations.push({
                    kind: 'expired',
                    finding,
                    exception,
                    detail: `expired ${-daysLeft} day(s) ago (${exception.expires}), owner ${exception.owner}`
                });
            } else if (escalated) {
                push(
                    {
                        kind: 'severity-increased',
                        finding,
                        exception,
                        detail: `recorded as ${exception.severity}, now ${finding.severity}`
                    },
                    this.registry.blocks(finding.severity, exception.context)
                );
            } else if (contextMismatch) {
                push(
                    {
                        kind: 'context-mismatch',
                        finding,
                        exception,
                        detail: `recorded as ${exception.context}, but declared through a runtime configuration`
                    },
                    this.registry.blocks(finding.severity, 'runtime')
                );
            } else {
                accepted.push({ finding, exception });
            }
        }

        // An exception with nothing left to excuse is dead weight, and here it
        // usually means the coordinate moved with an SDK bump. Blocking, so it
        // gets dropped — or re-argued for the version the advisory now reaches,
        // which is the case the detail line calls out separately, because the
        // rationale of every entry here is a claim about one version's code.
        for (const exception of this.registry.exceptions) {
            if (matched.has(this.registry.keyOfException(exception))) continue;
            const moved = versionsSeen.get(this.registry.coordinateKeyOfException(exception));
            violations.push({
                kind: 'stale',
                exception,
                detail: moved?.size
                    ? `recorded for ${this.registry.versionOfException(exception)}, but the advisory now ` +
                      `reaches ${[...moved].sort().join(', ')} — re-argue it for that version or drop this entry`
                    : 'advisory is gone from the scanned graph — drop this entry'
            });
        }

        return { violations, warnings, accepted, informational };
    }
}
