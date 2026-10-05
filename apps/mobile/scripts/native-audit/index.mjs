// Native dependency gate. `parse` turns the graphs an EAS build captured into the
// file contract; `gate` matches them against OSV and Sonatype and blocks on
// findings nobody has reviewed. See .claude/rules/dependency-security.md.
// Downloading a capture is in fetch-graphs.mjs instead: it needs EXPO_TOKEN, and
// nothing here may hold a credential.
//
// Exit codes: 0 ok · 1 policy violations · 2 bad input, broken registry or an
// unusable database.

import { appendFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DeclaredCoordinateCollector } from './android/declared-collector.mjs';
import { parseAndroidBundleGraph, parseAndroidGraph } from './android/graph-parser.mjs';
import { OsvClient } from './android/osv-client.mjs';
import { parsePodfileLock } from './ios/podfile-lock-parser.mjs';
import { SonatypeClient } from './ios/sonatype-client.mjs';
import { VendoredPodInventory } from './ios/vendored-inventory.mjs';
import { parseArgs } from './shared/cli.mjs';
import { GateEvaluator } from './shared/evaluator.mjs';
import {
    androidCoordinatesDocument,
    iosPodsDocument,
    loadResolvedCoordinates,
    loadResolvedPods,
    mergeResolvedCoordinates,
    readBuildMeta
} from './shared/graph-contract.mjs';
import { HttpClient } from './shared/http-client.mjs';
import { AdvisoryRegistry } from './shared/registry.mjs';
import { GateReport, reachedThrough } from './shared/report.mjs';
import { bySeverityThenName, countBySeverity, normalizeSeverity } from './shared/severity.mjs';
import { readBinaryFile, readJsonFile, readTextFile } from './shared/util.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
// The declared collector and the vendored pod inventory read the installed tree.
const REPO_ROOT = resolve(HERE, '../../../..');
// The registry sits beside the gate that checks it, not in a separate tree.
const REGISTRY_PATH = resolve(HERE, 'native-advisories.json');

const USAGE = [
    'Usage: node apps/mobile/scripts/native-audit/index.mjs <command> [options]',
    '',
    'Downloading a build`s capture lives in fetch-graphs.mjs, deliberately: it is',
    'the only command needing EXPO_TOKEN, and nothing here may hold a credential.',
    '',
    'parse   normalise one graph an EAS build captured',
    '  --android <file>     sdkDependencies.txt, or a Gradle `:app:dependencies` dump',
    '  --aab <file>         dependencies.pb, the bundle`s own copy of that message',
    '  --ios <file>         ios/Podfile.lock captured in the build',
    '  --out <file>         where to write the normalised JSON (required)',
    '  --build-meta <file>  `eas build:view <id> --json` payload, embedded as `build`',
    '',
    'gate    match a graph against the advisory databases',
    '  --graph <file>     gate the resolved Android graph in this android-coordinates.json',
    '                     instead of the coordinates declared in the installed tree.',
    '                     Repeatable: pass one per artifact a build resolved, and a',
    '                     coordinate in several of them is gated once, naming each',
    '  --pods <file>      also gate the resolved pods in this ios-pods.json, against',
    '                     Sonatype (needs SONATYPE_TOKEN)',
    '  --input <file>     read advisories from a saved snapshot instead of querying',
    '  --snapshot <file>  write the database answers to a file, replayable with --input',
    '  --markdown <file>  write the markdown report to a file as well',
    '  --summary <file>   write the one-line summary to a file, for a CI report',
    '  --inventory        print the collected coordinates and exit, without querying',
    ''
].join('\n');

const [command, ...argv] = process.argv.slice(2);
const { flag, option, options } = parseArgs(argv);

// ------------------------------------------------------------------- parse

function runParse() {
    const androidPath = option('--android');
    const bundlePath = option('--aab');
    const iosPath = option('--ios');
    const outPath = option('--out');

    if (!outPath) throw new Error('--out is required');
    if ([androidPath, bundlePath, iosPath].filter(Boolean).length !== 1)
        throw new Error('pass exactly one of --android, --aab or --ios');

    const build = readBuildMeta(option('--build-meta'));
    const write = document => writeFileSync(outPath, `${JSON.stringify(document, null, 4)}\n`);

    if (androidPath || bundlePath) {
        const capturedFrom = androidPath ?? bundlePath;
        const { label, source, coordinates } = androidPath
            ? parseAndroidGraph(readTextFile(androidPath, 'Android dependency capture'))
            : parseAndroidBundleGraph(readBinaryFile(bundlePath, 'AAB dependency capture'));
        write(androidCoordinatesDocument({ label, source, capturedFrom, build, coordinates }));
        console.log(
            `native-graph-parse: ${coordinates.length} resolved Maven coordinate(s) from ${source} -> ${outPath}`
        );
        return;
    }

    const { pods, cocoapods } = parsePodfileLock(readTextFile(iosPath, 'Podfile.lock'));
    write(iosPodsDocument({ capturedFrom: iosPath, cocoapods, build, pods }));
    console.log(
        `native-graph-parse: ${pods.length} installed pod(s), ` +
            `${pods.filter(pod => pod.queryable).length} from a spec repo -> ${outPath}`
    );
}

// -------------------------------------------------------------------- gate

const writeIfPath = (path, text) => {
    if (path) writeFileSync(path, `${text}\n`);
};

function publishMarkdown(path, markdown) {
    writeIfPath(path, markdown);
    if (process.env.GITHUB_STEP_SUMMARY)
        appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}

function findingsFrom(subjects, database, ecosystem) {
    const byKey = new Map(subjects.map(entry => [`${entry.name}@${entry.version}`, entry]));
    const findings = [];
    for (const [key, ids] of Object.entries(database.snapshot ?? {})) {
        const subject = byKey.get(key);
        if (!subject) continue;
        for (const id of ids) {
            const detail = database.details?.[id] ?? {
                severity: 'high',
                rated: false,
                summary: '',
                aliases: [],
                url: ''
            };
            // The clients already normalise this; doing it again here is what
            // keeps a `--input` snapshot from introducing a severity no threshold
            // matches, which would read as a non-blocking finding.
            findings.push({
                ...subject,
                ecosystem,
                id,
                ...detail,
                severity: normalizeSeverity(detail.severity)
            });
        }
    }
    return findings;
}

function printInventory({ mode, coordinates, pods, queryablePods, ios, unresolved }) {
    console.log(`native-audit-gate: ${coordinates.length} ${mode} Maven coordinate(s)`);
    // The artifact column only exists once a run gates more than one graph.
    const artifacts = coordinates.some(entry => entry.sources?.length > 1);
    for (const entry of coordinates)
        console.log(
            `  ${entry.graph.padEnd(7)} ` +
                (artifacts ? `${entry.sources.join('+').padEnd(7)} ` : '') +
                `${entry.name}@${entry.version}  ${reachedThrough(entry.declaredBy)}`
        );
    if (unresolved.length) {
        console.log(
            `\nnative-audit-gate: ${unresolved.length} declaration(s) with no version this mode can query`
        );
        for (const entry of unresolved)
            console.log(`  ${entry.name}  ${entry.reason}  ${reachedThrough(entry.declaredBy)}`);
    }
    if (pods.length) {
        console.log(
            `\nnative-audit-gate: ${pods.length} installed pod(s), ${queryablePods.length} of them in a database`
        );
        for (const pod of pods)
            console.log(`  ${pod.queryable ? 'gated ' : 'opaque'} ${pod.name}@${pod.version}`);
    }
    if (ios.length) {
        console.log(
            `\nnative-audit-gate: ${ios.length} vendored iOS dependenc(ies) (reported, never gated)`
        );
        for (const entry of ios) console.log(`  ${entry.name} ${entry.version}`);
    }
}

async function runGate() {
    const graphPaths = options('--graph');
    const podsPath = option('--pods');
    const inputPath = option('--input');
    const snapshotPath = option('--snapshot');
    const markdownPath = option('--markdown');
    const summaryPath = option('--summary');

    const registry = AdvisoryRegistry.load(REGISTRY_PATH);
    const registryErrors = registry.validate();
    if (registryErrors.length) {
        console.error('native-audit-gate: the advisory registry is invalid:');
        for (const error of registryErrors) console.error(`  - ${error}`);
        process.exit(2);
    }

    // Either the graphs a build resolved, or the coordinates declared in the
    // installed tree. Nothing after this point knows which.
    const graphs = graphPaths.map(path => loadResolvedCoordinates(path));
    const resolvedPods = podsPath ? loadResolvedPods(podsPath) : null;

    const mode = graphs.length ? 'resolved' : 'declared';
    const collector = graphs.length ? null : new DeclaredCoordinateCollector(REPO_ROOT);
    const coordinates = graphs.length ? mergeResolvedCoordinates(graphs) : collector.collect();
    // Declarations the installed tree names but cannot put a version on. Reported,
    // never gated — a resolved graph has none, because a build resolved them all.
    const unresolved = collector?.unresolved ?? [];
    const pods = resolvedPods ? resolvedPods.pods : [];
    const queryablePods = pods.filter(pod => pod.queryable);
    const ios = resolvedPods ? [] : new VendoredPodInventory(REPO_ROOT).collect();
    // Which build resolved which artifact.
    const builds = [
        ...graphs.map(graph => ({ label: graph.label, build: graph.build })),
        { label: 'pods', build: resolvedPods?.build }
    ].filter(entry => entry.build);

    if (!coordinates.length)
        throw new Error(
            'no Maven coordinates found — is the workspace installed? (`pnpm install --frozen-lockfile`)'
        );

    if (flag('--inventory')) {
        printInventory({ mode, coordinates, pods, queryablePods, ios, unresolved });
        return 0;
    }

    const empty = { snapshot: {}, details: {} };
    const http = new HttpClient();
    const sonatype = new SonatypeClient(http);

    // A run that could not reach a database is indistinguishable from a clean
    // one, which is the worst thing a security gate can be.
    const ask = async (label, work) => {
        try {
            return await work();
        } catch (error) {
            const message = `could not reach ${label}: ${error.message}`;
            publishMarkdown(markdownPath, GateReport.failure(message));
            writeIfPath(summaryPath, `❌ native dependency scan failed — ${message}`);
            throw new Error(message);
        }
    };

    let answers;
    if (inputPath) {
        answers = { ...empty, pods: empty, ...readJsonFile(inputPath, 'snapshot') };
    } else {
        answers = {
            ...(await ask('OSV', () => new OsvClient(http).query(coordinates))),
            pods: queryablePods.length
                ? await ask('Sonatype', () => sonatype.query(queryablePods))
                : empty
        };
        if (sonatype.creditsRemaining)
            console.log(`native-audit-gate: ${sonatype.creditsRemaining} Sonatype credit(s) left`);
        writeIfPath(snapshotPath, JSON.stringify(answers, null, 4));
    }

    const findings = [
        ...findingsFrom(coordinates, answers, 'Maven'),
        ...findingsFrom(queryablePods, answers.pods ?? empty, 'CocoaPods')
    ].sort(bySeverityThenName);

    const result = new GateEvaluator(registry).evaluate(findings);
    const report = new GateReport({
        mode,
        graphs: graphs.map(graph => ({ label: graph.label, count: graph.coordinates.length })),
        coordinates,
        pods,
        ios,
        builds,
        unknownPods: answers.pods?.unknown ?? [],
        unresolved,
        result,
        counts: countBySeverity(findings),
        findingCount: findings.length
    });

    const [headline, ...detail] = report.toConsoleLines();
    console.log(`native-audit-gate: ${headline}`);
    for (const line of detail) console.log(line);

    publishMarkdown(markdownPath, report.toMarkdown());
    writeIfPath(summaryPath, report.toSummaryLine());

    if (result.violations.length) {
        console.error(
            `native-audit-gate: ${result.violations.length} blocking finding(s) — upgrade the dependency, force a ` +
                'version through the config plugin, record a reviewed exception, or drop the stale one. ' +
                'See .claude/rules/dependency-security.md.'
        );
        return 1;
    }

    console.log('native-audit-gate: ok');
    return 0;
}

// -------------------------------------------------------------------- main

const SCOPE = {
    parse: 'native-graph-parse',
    gate: 'native-audit-gate'
};
const HELP = new Set(['help', '--help', '-h']);

if (HELP.has(command) || flag('--help') || flag('-h')) {
    console.log(USAGE);
    process.exit(0);
}

if (!command) {
    console.error(`native-audit: pick a command\n\n${USAGE}`);
    process.exit(2);
}

if (!(command in SCOPE)) {
    console.error(`native-audit: unknown command \`${command}\`\n\n${USAGE}`);
    process.exit(2);
}

try {
    const run = { parse: () => runParse() ?? 0, gate: runGate };
    process.exitCode = await run[command]();
} catch (error) {
    console.error(`${SCOPE[command]}: ${error.message}`);
    process.exit(2);
}
