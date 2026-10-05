import { KIND_LABEL } from './evaluator.mjs';

// A resolved graph reaches a widely shared library through dozens of paths, and
// listing all of them buries the ones that matter. The first few place it; the
// rest are in the graph file.
export const reachedThrough = (paths = []) =>
    paths.slice(0, 4).join(', ') + (paths.length > 4 ? `, +${paths.length - 4} more` : '');

export class GateReport {
    constructor({
        mode,
        graphs,
        coordinates,
        pods,
        ios,
        builds,
        unknownPods,
        unresolved,
        result,
        counts,
        findingCount
    }) {
        this.mode = mode;
        this.graphs = graphs ?? [];
        this.coordinates = coordinates;
        this.pods = pods;
        this.ios = ios;
        this.builds = builds ?? [];
        this.unknownPods = unknownPods ?? [];
        this.unresolved = unresolved ?? [];
        this.result = result;
        this.counts = counts;
        this.findingCount = findingCount;
    }

    get queryablePods() {
        return this.pods.filter(pod => pod.queryable);
    }

    // `from apk+aab` once a run gates more than one artifact.
    get artifacts() {
        return this.graphs.length > 1
            ? ` from ${this.graphs.map(graph => graph.label).join('+')}`
            : '';
    }

    get scannedLabel() {
        return (
            `${this.coordinates.length} ${this.mode} coordinate(s)${this.artifacts}` +
            (this.queryablePods.length ? ` + ${this.queryablePods.length} pod(s)` : '') +
            (this.unresolved.length ? `, ${this.unresolved.length} unqueryable` : '')
        );
    }

    // No brackets, backticks, quotes or dollars anywhere in the summary: it
    // travels through EAS Workflows' `set-output` into its own bash, which does
    // not quote-safely interpolate any of them.
    get scannedPlain() {
        return (
            `${this.coordinates.length} ${this.mode} coordinates${this.artifacts}` +
            (this.queryablePods.length ? ` + ${this.queryablePods.length} pods` : '') +
            (this.unresolved.length ? `, ${this.unresolved.length} unqueryable` : '')
        );
    }

    toSummaryLine() {
        const { violations, warnings } = this.result;
        if (violations.length)
            return `❌ ${violations.length} blocking, ${warnings.length} to review · ${this.scannedPlain}`;
        if (warnings.length)
            return `⚠️ ${warnings.length} to review, none blocking · ${this.scannedPlain}`;
        return `✅ clean · ${this.scannedPlain}`;
    }

    toConsoleLines() {
        const { violations, warnings, accepted, informational } = this.result;
        const lines = [
            `${this.scannedLabel}, ${this.findingCount} advisory record(s) — ` +
                `${this.counts.critical} critical, ${this.counts.high} high, ` +
                `${this.counts.moderate} moderate, ${this.counts.low} low`
        ];
        for (const entry of [...violations, ...warnings]) {
            const source = entry.finding ?? entry.exception;
            const coordinate = `${source.name ?? source.package}@${source.version ?? '?'}`;
            lines.push(
                `  [${KIND_LABEL[entry.kind]}] ${source.severity} ${coordinate} ${source.id} — ${entry.detail}`
            );
        }
        lines.push(`  ${accepted.length} accepted, ${informational.length} non-blocking`);
        // Not a finding and not a clean result either — the part of the graph this
        // mode could not put a version on, so it never reached a database.
        if (this.unresolved.length)
            lines.push(
                `  ${this.unresolved.length} declaration(s) with no queryable version — see the report`
            );
        return lines;
    }

    // `runtime · aab` is the case that matters: in the bundle, not in the APK.
    #graphCell(entry) {
        const finding = entry.finding;
        if (!finding) return entry.exception?.context ?? '—';
        const sources = finding.sources ?? [];
        return this.graphs.length > 1 && sources.length
            ? `${finding.graph} · ${sources.join('+')}`
            : finding.graph;
    }

    #table(entries) {
        return [
            '| Verdict | Severity | Package | Advisory | Graph | Reached through | Detail |',
            '| --- | --- | --- | --- | --- | --- | --- |',
            ...entries.map(entry => {
                const source = entry.finding ?? entry.exception;
                const through = entry.finding?.declaredBy ?? entry.exception?.declaredBy ?? [];
                const cells = [
                    KIND_LABEL[entry.kind],
                    source.severity ?? '',
                    `\`${source.name ?? source.package ?? ''}@${source.version ?? '?'}\``,
                    entry.finding?.url ? `[${source.id}](${entry.finding.url})` : (source.id ?? ''),
                    this.#graphCell(entry),
                    reachedThrough(through) || '—',
                    entry.detail
                ];
                return `| ${cells.join(' | ')} |`;
            }),
            ''
        ];
    }

    #buildLines() {
        const { builds } = this;
        if (!builds.length) return [];

        const describe = ({ build }) =>
            `build \`${build.id}\` · ${build.platform} · profile \`${build.profile}\` · ` +
            `v${build.appVersion} build ${build.appBuildVersion} · ` +
            `commit \`${(build.gitCommitHash ?? '').slice(0, 8)}\``;

        if (builds.length === 1) return [`Resolved by EAS ${describe(builds[0])}.`, ''];
        return [
            'Resolved by the EAS builds this run gated:',
            '',
            ...builds.map(entry => `- \`${entry.label}\` — ${describe(entry)}`),
            ''
        ];
    }

    toMarkdown() {
        const { result, counts, graphs, pods, ios, unknownPods, unresolved } = this;
        const lines = ['## Native dependency advisories', '', ...this.#buildLines()];

        const subjects = [
            `${this.coordinates.length} ${this.mode} Maven coordinate(s)` +
                (graphs.length > 1
                    ? ` (${graphs.map(graph => `${graph.count} in ${graph.label}`).join(', ')})`
                    : '')
        ];
        if (pods.length)
            subjects.push(
                `${pods.length} installed pod(s), ${this.queryablePods.length} of them queried`
            );

        lines.push(
            `**${subjects.join(' · ')}** — ` +
                `${counts.critical} critical · ${counts.high} high · ${counts.moderate} moderate · ${counts.low} low. ` +
                `${result.accepted.length} accepted by the registry, ${result.violations.length} blocking, ` +
                `${result.warnings.length} to review.`,
            ''
        );

        if (result.violations.length)
            lines.push('### Blocking', '', ...this.#table(result.violations));
        if (result.warnings.length)
            lines.push('### Needs attention', '', ...this.#table(result.warnings));

        if (result.informational.length) {
            lines.push(
                `<details><summary>${result.informational.length} non-blocking advisory record(s)</summary>`,
                '',
                ...result.informational.map(
                    entry =>
                        `- ${entry.finding.severity} · \`${entry.finding.name}@${entry.finding.version}\` · ` +
                        `${entry.finding.id} · ${this.#graphCell(entry)}`
                ),
                '',
                '</details>',
                ''
            );
        }

        if (!result.violations.length && !result.warnings.length)
            lines.push('✅ No blocking advisories and nothing awaiting review.', '');

        // A pod the database has never heard of is not a pod with no advisories,
        // and the two are indistinguishable in a clean report unless it says so.
        if (unknownPods.length) {
            lines.push(
                `⚠️ ${unknownPods.length} pod(s) were queried and Sonatype has no record of them — ` +
                    'an empty result from a component it never indexed is not a clean one: ' +
                    unknownPods.map(pod => `\`${pod}\``).join(', '),
                ''
            );
        }

        // Same argument for the declared mode: a coordinate whose version only
        // Gradle knows was never asked about, which is not the same as clean.
        if (unresolved.length) {
            lines.push(
                `<details><summary>⚠️ ${unresolved.length} declaration(s) never queried — no version this mode can resolve</summary>`,
                '',
                'Declared in the installed tree, but the version comes from a BOM, a Gradle property or a',
                'dynamic range, so only a resolved graph from a build names it. Never asked about is not',
                'the same as clean.',
                '',
                ...unresolved.map(
                    entry =>
                        `- \`${entry.name}\` — ${entry.reason} · ${reachedThrough(entry.declaredBy)}`
                ),
                '',
                '</details>',
                ''
            );
        }

        if (pods.length) {
            const opaque = pods.filter(pod => !pod.queryable);
            lines.push(
                `<details><summary>${opaque.length} pod(s) never queried — no database can answer about them</summary>`,
                '',
                'Each is a `:path` pod from node_modules, versioned by the npm package that ships it, so',
                'no record keyed by pod and version can exist.',
                '',
                ...opaque.map(pod => `- \`${pod.name}\` ${pod.version}`),
                '',
                '</details>',
                ''
            );
        }

        if (ios.length) {
            lines.push(
                `<details><summary>iOS inventory — ${ios.length} vendored dependenc(ies), reported not gated</summary>`,
                '',
                'This run had no resolved pod graph, so these are the versions vendored in the installed',
                'tree, not the ones a build resolved. Listed as inventory; none of them was queried.',
                '',
                ...ios.map(entry => `- \`${entry.name}\` ${entry.version}`),
                '',
                '</details>',
                ''
            );
        }

        return lines.join('\n');
    }

    static failure(message) {
        return `## Native dependency advisories\n\n❌ Scan failed — ${message}\n`;
    }
}
