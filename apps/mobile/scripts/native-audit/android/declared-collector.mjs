import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { pnpmPackages, reactNativeDirs } from '../shared/installed-tree.mjs';
import { byNameThenVersion, compareStrings, readDirs } from '../shared/util.mjs';

// A dependency declaration is a configuration name followed by a coordinate
// string, optionally wrapped in `platform(...)`. The base is matched as a
// *suffix* with an optional variant prefix rather than against a list of whole
// names, because the names that matter are not all Gradle's own: measured in this
// tree, `releaseCompileOnly` and expo-dev-menu's local `debugOnly`/`debugOnlyApi`
// closures declare six coordinates with literal versions that a fixed list
// missed entirely.
const DECLARATION =
    /(?:^|[\s{};(,])([a-zA-Z][a-zA-Z0-9]*)\s*(?:\(\s*)?(?:(?:enforced)?[Pp]latform\s*\(\s*)?(["'])(.*?)\2/g;

const CONFIGURATION =
    /^([a-z][a-zA-Z0-9]*?)?(implementation|api|only|annotationProcessor|kapt|ksp)$/i;

// `group:artifact[:version][:classifier][@type]`. The old pattern anchored the
// version to `[0-9]` and forbade `@`, which dropped two real runtime coordinates:
// `com.github.Dimezis:BlurView:version-2.0.6` and
// `me.leolin:ShortcutBadger:1.1.22@aar`.
const GROUP = /^[a-zA-Z][\w.-]*$/;
const ARTIFACT = /^[\w.-]+$/;

// How much of the shipped binary a configuration puts an artifact into.
// `implementation`/`api`/`compileOnly` reach the release APK; `test*` and
// `debug*` do not, and an annotation processor runs at build time only. This is
// the native counterpart of `dev: false` in `pnpm audit`, and the only hard
// signal this collector has — the label is the configuration name, never a guess.
const GRAPH_RANK = { runtime: 3, build: 2, dev: 1, test: 0 };

const graphOf = (prefix, base) => {
    if (/^(annotationProcessor|kapt|ksp)$/i.test(base)) return 'build';
    if (/test/i.test(prefix)) return 'test';
    if (/debug/i.test(prefix)) return 'dev';
    return 'runtime';
};

const mostShipping = graphs =>
    graphs.reduce((winner, graph) => (GRAPH_RANK[graph] > GRAPH_RANK[winner] ? graph : winner));

const configurationGraph = name => {
    const parsed = name.match(CONFIGURATION);
    // An unrecognised name reaching here is a reference this collector cannot
    // classify, so it takes the strictest reading rather than being dropped.
    return parsed ? graphOf(parsed[1] ?? '', parsed[2]) : 'runtime';
};

// `//noinspection` markers sit directly above declarations in expo-dev-menu, and
// a commented-out example coordinate would otherwise read as a declaration. The
// `[^:]` guard keeps `https://` in a repository url from being eaten.
const stripComments = text =>
    text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

// Why a declaration could not be turned into a coordinate this gate can query.
// None of these is resolvable without running Gradle, which is the whole
// difference between this mode and the resolved graph — so they are reported
// rather than dropped, because a declaration nobody scanned and a declaration
// with no advisories look identical in a clean report.
function unresolvableReason(version) {
    if (version === null) return 'no version declared — a BOM or the react-native plugin sets it';
    if (version.includes('$')) return 'version interpolated from a Gradle property';
    if (version.includes('+')) return 'dynamic version — Gradle picks it at resolve time';
    return null;
}

function parseNotation(notation) {
    const [body] = notation.split('@');
    const [group, artifact, version] = body.split(':');
    if (!GROUP.test(group ?? '') || !ARTIFACT.test(artifact ?? '')) return null;
    return { name: `${group}:${artifact}`, version: version ?? null };
}

// Reads the Maven coordinates *declared* in the installed tree, with no JDK, no
// Android SDK and no `expo prebuild` — at the cost of missing transitive
// dependencies and of reporting versions that lose a conflict resolution and
// never ship. The resolved graph from a build is the authoritative record.
//
// The map form (`implementation group: "g", name: "a", version: "1.0"`) is not
// read. Measured: no package in this tree uses it. It would arrive as neither a
// coordinate nor an unresolved declaration, so add it here if one ever does.
export class DeclaredCoordinateCollector {
    constructor(repoRoot) {
        this.repoRoot = repoRoot;
        this.found = new Map();
        this.unparsed = new Map();
        this.unresolved = [];
    }

    collect() {
        this.found = new Map();
        this.unparsed = new Map();
        this.#collectRepoModules();
        this.#collectNpmPackages();
        this.#collectVersionCatalog();

        this.unresolved = [...this.unparsed.values()]
            .map(entry => ({ ...entry, declaredBy: [...entry.declaredBy].sort(compareStrings) }))
            .sort((a, b) => compareStrings(a.name, b.name) || compareStrings(a.reason, b.reason));

        return [...this.found.values()]
            .map(entry => ({ ...entry, declaredBy: [...entry.declaredBy].sort(compareStrings) }))
            .sort(byNameThenVersion);
    }

    #add(entry) {
        const key = `${entry.name}@${entry.version}`;
        const existing = this.found.get(key);
        if (!existing) {
            this.found.set(key, { ...entry, declaredBy: new Set([entry.declaredBy]) });
            return;
        }
        existing.declaredBy.add(entry.declaredBy);
        // Declared through a configuration that ships more of it anywhere means it
        // ships that much.
        existing.graph = mostShipping([existing.graph, entry.graph]);
    }

    #addUnresolved(name, reason, declaredBy) {
        const key = `${name}|${reason}`;
        const existing = this.unparsed.get(key);
        if (existing) existing.declaredBy.add(declaredBy);
        else this.unparsed.set(key, { name, reason, declaredBy: new Set([declaredBy]) });
    }

    #scanGradleFile(file, declaredBy) {
        const text = stripComments(readFileSync(file, 'utf8'));
        for (const match of text.matchAll(DECLARATION)) {
            const configuration = match[1].match(CONFIGURATION);
            if (!configuration) continue;

            const parsed = parseNotation(match[3]);
            if (!parsed) continue;

            const graph = graphOf(configuration[1] ?? '', configuration[2]);
            const reason = unresolvableReason(parsed.version);
            if (reason) {
                this.#addUnresolved(parsed.name, reason, declaredBy);
                continue;
            }
            this.#add({ name: parsed.name, version: parsed.version, graph, declaredBy });
        }
    }

    // Our own native modules, and the JVM host-test harness one level deeper.
    #collectRepoModules() {
        const modulesRoot = join(this.repoRoot, 'apps/mobile/modules');
        for (const mod of readDirs(modulesRoot)) {
            const androidDir = join(modulesRoot, mod, 'android');
            const dirs = [androidDir, ...readDirs(androidDir).map(sub => join(androidDir, sub))];
            for (const dir of dirs) {
                for (const name of ['build.gradle', 'build.gradle.kts']) {
                    const file = join(dir, name);
                    if (existsSync(file)) this.#scanGradleFile(file, 'repo');
                }
            }
        }
    }

    #collectNpmPackages() {
        for (const { name, path } of pnpmPackages(this.repoRoot)) {
            const file = join(path, 'android/build.gradle');
            if (existsSync(file)) this.#scanGradleFile(file, `npm:${name}`);
        }
    }

    // react-native pins its own Maven dependencies in a Gradle version catalog,
    // which records a coordinate without a configuration. Resolving the alias
    // back to its use site supplies the missing signal — and drops the aliases
    // that are declared but never referenced, so are not in the build at all.
    #collectVersionCatalog() {
        for (const rn of reactNativeDirs(this.repoRoot)) {
            const file = join(rn, 'gradle/libs.versions.toml');
            if (!existsSync(file)) continue;
            const toml = readFileSync(file, 'utf8');
            const gradleSources = readGradleSources(rn);

            const versions = {};
            for (const match of toml.matchAll(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/gm))
                versions[match[1]] = match[2];

            for (const match of toml.matchAll(/^([a-zA-Z0-9_-]+)\s*=\s*\{\s*(.+?)\s*\}$/gm)) {
                const [, alias, spec] = match;
                const module = spec.match(/module\s*=\s*"([^"]+)"/);
                const group = spec.match(/group\s*=\s*"([^"]+)"/);
                const artifact = spec.match(/name\s*=\s*"([^"]+)"/);
                const ref = spec.match(/version\.ref\s*=\s*"([^"]+)"/);
                const literal = spec.match(/version\s*=\s*"([^"]+)"/);

                const name = module
                    ? module[1]
                    : group && artifact
                      ? `${group[1]}:${artifact[1]}`
                      : null;
                if (!name) continue;

                const configurations = configurationsFor(gradleSources, alias);
                if (!configurations.length) continue;

                const graph = mostShipping(configurations.map(configurationGraph));
                const declaredBy = `npm:react-native(catalog, ${[...new Set(configurations)].sort(compareStrings).join('/')})`;

                // An alias whose `version.ref` points at nothing is referenced by
                // the build and still unqueryable, which is exactly the case this
                // used to drop on the floor.
                const version = ref ? versions[ref[1]] : literal ? literal[1] : null;
                const reason = version
                    ? unresolvableReason(version)
                    : 'catalog alias with no resolvable version';
                if (reason) {
                    this.#addUnresolved(name, reason, declaredBy);
                    continue;
                }

                this.#add({ name, version, graph, declaredBy });
            }
        }
    }
}

function readGradleSources(root, depth = 0) {
    if (depth > 5) return '';
    let text = '';
    for (const entry of existsSync(root) ? readdirSync(root, { withFileTypes: true }) : []) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const path = join(root, entry.name);
        if (entry.isDirectory()) text += readGradleSources(path, depth + 1);
        else if (/\.gradle(\.kts)?$/.test(entry.name)) text += `${readFileSync(path, 'utf8')}\n`;
    }
    return text;
}

// Which Gradle configurations reference a catalog alias. Gradle's generated
// accessors turn `-` into `.`, and the lookahead stops `libs.androidx.appcompat`
// from also matching `libs.androidx.appcompat.resources`. An intervening
// `platform(...)` is transparent, so a BOM keeps the configuration that declares
// it rather than reporting `platform` as one.
function configurationsFor(gradleSources, alias) {
    const accessor = `libs.${alias.replace(/-/g, '.')}`.replace(/[.]/g, '\\.');
    const pattern = new RegExp(
        `([a-zA-Z]\\w*)\\s*[( ]\\s*(?:(?:enforced)?[Pp]latform\\s*\\(\\s*)?${accessor}(?![\\w.])`,
        'g'
    );
    return [...gradleSources.matchAll(pattern)].map(match => match[1]);
}
