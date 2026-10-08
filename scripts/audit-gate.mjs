// Dependency advisory gate.
//
// `pnpm audit` on its own is unusable as a CI gate: the graph carries a long
// tail of advisories in build and dev tooling that nobody will fix in whichever
// PR happens to touch the lockfile. So this gates on the *delta* instead — an
// advisory blocks only while it has no reviewed exception in
// security/dependency-advisories.json. Every entry in that registry is an
// explicit, owned, expiring decision to accept a known risk.
//
// Run by the `dependency-advisories` job in .github/workflows/ci.yml (every PR
// to master and release/**) and by `pnpm dependencies-audit` locally, with the
// same policy in both. Nothing runs it on a schedule: discovery between PRs is
// Dependabot's job, and an exception that crosses its `expires` date is caught
// by the next PR. See .claude/rules/dependency-security.md for how the two
// divide the work.
//
// Node 24 + pnpm on PATH. No external deps on purpose — a security gate that
// needs its own dependency tree defeats the point, and that is also why the
// registry is JSON rather than YAML: no parser to install.
//
// Exit codes: 0 ok · 1 policy violations · 2 broken registry / unusable audit.

import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_PATH = resolve(ROOT, 'security/dependency-advisories.json');

const SEVERITY_RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };
const VALID_CONTEXTS = ['runtime', 'build', 'dev', 'rn-dev'];

// `in` walks the prototype chain, so `severity: "constructor"` passes a
// membership test and then ranks as a function: every comparison against it is
// false, which silently disables the ESCALATED check. Own properties only, and
// a severity this gate cannot rank takes the strictest reading short of
// critical rather than matching no threshold at all.
const isSeverity = value => typeof value === 'string' && Object.hasOwn(SEVERITY_RANK, value);
const normalizeSeverity = value => (isSeverity(value) ? value : 'high');
const rankOf = value => SEVERITY_RANK[normalizeSeverity(value)];

// Overridable from the registry's own `policy` block, so tightening the gate is
// a reviewable diff there rather than a code change.
const DEFAULT_POLICY = {
    blockingSeverities: ['critical', 'high']
};

const AUDIT_ATTEMPTS = 3;
const AUDIT_RETRY_BASE_MS = 5000;
// A hung fetch must not sit on a CI runner until the job-level timeout kills it.
const AUDIT_TIMEOUT_MS = 120000;

const args = process.argv.slice(2);
const flag = name => args.includes(name);
const option = name => {
    const index = args.indexOf(name);
    return index !== -1 ? args[index + 1] : undefined;
};

if (flag('--help') || flag('-h')) {
    console.log(
        [
            'Usage: node scripts/audit-gate.mjs [options]',
            '',
            '  --input <file>     read a saved `pnpm audit --json` payload instead of querying',
            '                     the npm registry',
            '  --markdown <file>  write the markdown report to a file as well',
            ''
        ].join('\n')
    );
    process.exit(0);
}

const inputPath = option('--input');
const markdownPath = option('--markdown');

const today = startOfDay(new Date());

// `<` and `>` instead of localeCompare, per packages/core/src/utils/string.ts.
const compareStrings = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const sleepSync = ms => {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

// `pnpm audit` exits 1 whenever it reports anything at all, so the exit code
// says nothing; only the payload does. A registry outage arrives as
// {"error":{...}} in place of {"advisories":...}.
function runAudit() {
    if (inputPath) return { report: JSON.parse(readFileSync(inputPath, 'utf8')) };

    let lastError = 'unknown error';
    for (let attempt = 1; attempt <= AUDIT_ATTEMPTS; attempt++) {
        const run = spawnSync('pnpm', ['audit', '--json'], {
            cwd: ROOT,
            encoding: 'utf8',
            maxBuffer: 64 * 1024 * 1024,
            timeout: AUDIT_TIMEOUT_MS
        });

        if (run.error) {
            lastError = run.error.message;
        } else {
            const payload = extractJson(run.stdout ?? '');
            if (payload?.advisories) return { report: payload };
            lastError =
                payload?.error?.message ?? (run.stderr || 'unparseable audit output').trim();
        }

        if (attempt < AUDIT_ATTEMPTS) {
            const wait = AUDIT_RETRY_BASE_MS * attempt;
            console.warn(`pnpm audit failed (${lastError}) — retrying in ${wait / 1000}s`);
            sleepSync(wait);
        }
    }
    return { error: lastError };
}

// pnpm prefixes the payload with [WARN] lines when it dislikes the environment.
function extractJson(stdout) {
    const start = stdout.indexOf('{');
    const end = stdout.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
        return JSON.parse(stdout.slice(start, end + 1));
    } catch {
        return null;
    }
}

function collectAdvisories(report) {
    return Object.values(report.advisories ?? {})
        .map(advisory => {
            const findings = advisory.findings ?? [];
            // `dev: false` means reachable through the production graph, which
            // is not the same as running in the shipped bundle — react-native's
            // dev-server code is a prod dependency. Closing that gap is exactly
            // what an exception's context and rationale are for.
            const graph = findings.some(finding => finding.dev === false) ? 'runtime' : 'dev';

            return {
                // The numeric npm id is the fallback for the rare advisory whose
                // url pnpm cannot derive a GHSA from. Kept in canonical case — only
                // matching is case-insensitive.
                id: advisory.github_advisory_id?.trim() || `NPM:${advisory.id}`,
                package: advisory.module_name,
                severity: normalizeSeverity(advisory.severity),
                title: advisory.title ?? '',
                url: advisory.url ?? '',
                patched: advisory.patched_versions ?? null,
                graph
            };
        })
        .sort(bySeverityThenPackage);
}

function bySeverityThenPackage(a, b) {
    return (
        rankOf(b.severity) - rankOf(a.severity) ||
        compareStrings(String(a.package), String(b.package)) ||
        compareStrings(String(a.id), String(b.id))
    );
}

const normalizeId = value => (typeof value === 'string' ? value.trim().toUpperCase() : '');

function loadRegistry() {
    if (!existsSync(REGISTRY_PATH)) fail(`registry not found: ${REGISTRY_PATH}`);

    let parsed;
    try {
        parsed = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
    } catch (error) {
        fail(`registry is not valid JSON: ${error.message}`);
    }

    return {
        ...parsed,
        policy: { ...DEFAULT_POLICY, ...(parsed.policy ?? {}) },
        exceptions: parsed.exceptions ?? []
    };
}

// A registry nobody can parse is worse than no gate at all, so structural
// problems are fatal: exit 2, before the audit is even run.
function validateRegistry(registry) {
    const errors = [];
    const seen = new Set();

    // The policy is validated as strictly as an exception is: a
    // `blockingSeverities` written as a string turns `includes` into a substring
    // test, and one carrying a severity this gate cannot rank blocks nothing.
    // Both leave the gate reporting a clean run.
    const { blockingSeverities } = registry.policy;
    if (!Array.isArray(blockingSeverities)) {
        errors.push('policy.blockingSeverities: must be an array of severities');
    } else {
        const unknown = blockingSeverities.filter(severity => !isSeverity(severity));
        if (unknown.length)
            errors.push(
                `policy.blockingSeverities: ${unknown.map(String).join(', ')} is not a known severity`
            );
    }

    registry.exceptions.forEach((exception, index) => {
        const where = `exceptions[${index}]${exception.id ? ` (${exception.id})` : ''}`;
        const check = (field, ok, message) => {
            if (!ok) errors.push(`${where}: ${field} ${message}`);
        };
        const filled = field => typeof exception[field] === 'string' && exception[field].trim();

        const id = normalizeId(exception.id);
        check('id', id.startsWith('GHSA-') || id.startsWith('NPM:'), 'must be a GHSA or NPM: id');
        check('id', !seen.has(id), 'is listed twice');
        seen.add(id);

        check('package', filled('package'), 'is required');
        check('severity', isSeverity(exception.severity), 'must be a known severity');
        check(
            'context',
            VALID_CONTEXTS.includes(exception.context),
            `must be one of ${VALID_CONTEXTS.join(', ')}`
        );
        check('rationale', filled('rationale'), 'is required');
        check('owner', filled('owner'), 'is required');
        check('expires', isIsoDate(exception.expires), 'must be a YYYY-MM-DD date');
    });

    return errors;
}

function evaluate(advisories, registry) {
    const { policy } = registry;
    const blocks = severity => policy.blockingSeverities.includes(severity);
    const byId = new Map(
        registry.exceptions.map(exception => [normalizeId(exception.id), exception])
    );
    const matched = new Set();

    const violations = [];
    const warnings = [];
    const accepted = [];
    const informational = [];
    const push = (entry, blocking) => (blocking ? violations : warnings).push(entry);

    for (const advisory of advisories) {
        const exception = byId.get(normalizeId(advisory.id));

        if (!exception) {
            if (blocks(advisory.severity)) {
                violations.push({
                    kind: 'unreviewed',
                    advisory,
                    detail: 'no reviewed exception in the registry'
                });
            } else {
                informational.push({ advisory });
            }
            continue;
        }

        matched.add(normalizeId(advisory.id));
        const daysLeft = daysUntil(exception.expires);
        // An exception whose recorded severity or execution context no longer
        // matches reality was approved against a different risk.
        const escalated = rankOf(advisory.severity) > rankOf(exception.severity);
        // `rn-dev` already concedes the package sits in the production graph —
        // that is its whole definition — so only the contexts that claim the
        // package is *outside* it can be contradicted by the graph.
        const contextMismatch =
            advisory.graph === 'runtime' && ['build', 'dev'].includes(exception.context);

        if (daysLeft < 0) {
            violations.push({
                kind: 'expired',
                advisory,
                exception,
                detail: `expired ${-daysLeft} day(s) ago (${exception.expires}), owner ${exception.owner}`
            });
        } else if (escalated) {
            push(
                {
                    kind: 'severity-increased',
                    advisory,
                    exception,
                    detail: `recorded as ${exception.severity}, now ${advisory.severity}`
                },
                blocks(advisory.severity)
            );
        } else if (contextMismatch) {
            push(
                {
                    kind: 'context-mismatch',
                    advisory,
                    exception,
                    detail: `recorded as ${exception.context}, now reachable through the production graph`
                },
                blocks(advisory.severity)
            );
        } else {
            accepted.push({ advisory, exception });
        }
    }

    // An exception with nothing left to excuse is dead weight, and it usually
    // comes paired with an `overrides` entry in pnpm-workspace.yaml that is now
    // pinning a transitive dependency for no reason. Blocking, so both go.
    for (const exception of registry.exceptions) {
        if (matched.has(normalizeId(exception.id))) continue;
        violations.push({
            kind: 'stale',
            exception,
            detail: 'advisory is gone from the graph — drop this entry'
        });
    }

    return { violations, warnings, accepted, informational };
}

const KIND_LABEL = {
    unreviewed: 'NEW',
    expired: 'EXPIRED',
    'severity-increased': 'ESCALATED',
    'context-mismatch': 'CONTEXT',
    stale: 'STALE'
};

const advisoryLink = (id, url) => (url ? `[${id}](${url})` : (id ?? ''));

function renderMarkdown(result, counts) {
    const lines = ['## Dependency advisories', ''];

    lines.push(
        `**${counts.critical ?? 0} critical · ${counts.high ?? 0} high · ` +
            `${counts.moderate ?? 0} moderate · ${counts.low ?? 0} low** — ` +
            `${result.accepted.length} accepted by the registry, ${result.violations.length} blocking, ` +
            `${result.warnings.length} to review.`,
        ''
    );

    const table = entries => [
        '| Verdict | Severity | Package | Advisory | Graph | Detail |',
        '| --- | --- | --- | --- | --- | --- |',
        ...entries.map(entry => {
            const source = entry.advisory ?? entry.exception;
            const cells = [
                KIND_LABEL[entry.kind],
                source.severity ?? '',
                `\`${source.package ?? ''}\``,
                advisoryLink(source.id, entry.advisory?.url ?? entry.exception?.url),
                entry.advisory?.graph ?? entry.exception?.context ?? '—',
                entry.detail
            ];
            return `| ${cells.join(' | ')} |`;
        }),
        ''
    ];

    if (result.violations.length) lines.push('### Blocking', '', ...table(result.violations));
    if (result.warnings.length) lines.push('### Needs attention', '', ...table(result.warnings));

    if (result.informational.length) {
        lines.push(
            `<details><summary>${result.informational.length} non-blocking advisory record(s)</summary>`,
            '',
            ...result.informational.map(
                ({ advisory }) =>
                    `- ${advisory.severity} · \`${advisory.package}\` · ` +
                    `${advisoryLink(advisory.id, advisory.url)} · ${advisory.graph}`
            ),
            '',
            '</details>',
            ''
        );
    }

    if (!result.violations.length && !result.warnings.length) {
        lines.push('✅ No blocking advisories and nothing awaiting review.', '');
    }

    return lines.join('\n');
}

function publish(markdown) {
    if (markdownPath) writeFileSync(markdownPath, `${markdown}\n`);
    if (process.env.GITHUB_STEP_SUMMARY)
        appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}

function startOfDay(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isIsoDate(value) {
    return (
        typeof value === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(value))
    );
}

const daysUntil = value =>
    Math.round((startOfDay(new Date(value)).getTime() - today.getTime()) / 86400000);

function fail(message) {
    console.error(`audit-gate: ${message}`);
    process.exit(2);
}

const registry = loadRegistry();

const registryErrors = validateRegistry(registry);
if (registryErrors.length) {
    console.error('audit-gate: the advisory registry is invalid:');
    for (const error of registryErrors) console.error(`  - ${error}`);
    process.exit(2);
}

const { report, error } = runAudit();

if (error) {
    // A run that passes without having scanned the graph is indistinguishable
    // from a clean one, which is the worst thing a security gate can be. The
    // retries above absorb a flaking endpoint; past those there is no answer.
    const message = `could not reach the advisory registry: ${error}`;
    publish(`## Dependency advisories\n\n❌ Scan failed — ${message}\n`);
    fail(message);
}

const advisories = collectAdvisories(report);
const counts = report.metadata?.vulnerabilities ?? {};

const result = evaluate(advisories, registry);

console.log(
    `audit-gate: ${advisories.length} advisory record(s) — ${counts.critical ?? 0} critical, ` +
        `${counts.high ?? 0} high, ${counts.moderate ?? 0} moderate, ${counts.low ?? 0} low`
);
for (const entry of [...result.violations, ...result.warnings]) {
    const source = entry.advisory ?? entry.exception;
    console.log(
        `  [${KIND_LABEL[entry.kind]}] ${source.severity} ${source.package} ${source.id} — ${entry.detail}`
    );
}
console.log(`  ${result.accepted.length} accepted, ${result.informational.length} non-blocking`);

publish(renderMarkdown(result, counts));

if (result.violations.length) {
    console.error(
        `audit-gate: ${result.violations.length} blocking finding(s) — upgrade the dependency, record a ` +
            'reviewed exception, or drop the stale one. See .claude/rules/dependency-security.md.'
    );
    process.exit(1);
}

console.log('audit-gate: ok');
