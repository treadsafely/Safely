import { byNameThenVersion, compareStrings } from '../shared/util.mjs';

export const GRADLE_CONFIGURATION = 'releaseRuntimeClasspath';

// Gradle indents one level per five columns (`|    ` or five spaces) and marks
// each node with `+--- ` or `\--- `.
const TREE_LINE = /^((?:[|] {4}| {5})*)(?:\+---|\\---) (.+)$/;

// Suffixes Gradle appends after the coordinate: `(*)` subtree already printed
// above, `(c)` a dependency *constraint* rather than a dependency, `(n)` not
// resolved. Only `(c)` and `(n)` change what the node means.
function parseNode(text) {
    const marker = text.match(/\s\(([*cn])\)$/);
    const body = marker ? text.slice(0, -marker[0].length).trim() : text.trim();
    return { body, constraint: marker?.[1] === 'c', unresolved: marker?.[1] === 'n' };
}

// Four shapes reach this function, all of them in the fixture it was written
// against:
//   group:artifact:1.2.3
//   group:artifact:1.2.3 -> 1.2.4                   version substituted
//   group:artifact -> 1.2.4                         no version requested
//   group:artifact:+ -> other.group:artifact:1.2.3  module substituted
export function resolveCoordinate(body) {
    const [requested, ...rest] = body.split(' -> ');
    const substitute = rest.length ? rest[rest.length - 1].trim() : null;

    if (substitute?.includes(':')) {
        const parts = substitute.split(':');
        if (parts.length < 3) return null;
        return { name: parts.slice(0, -1).join(':'), version: parts[parts.length - 1] };
    }

    const parts = requested.trim().split(':');
    const version = substitute ?? (parts.length >= 3 ? parts[parts.length - 1] : null);
    if (!version) return null;
    const name = parts.length >= 3 ? parts.slice(0, -1).join(':') : parts.join(':');
    return name.includes(':') ? { name, version } : null;
}

// How a node is named in `declaredBy`: an included project by its Gradle path, a
// module by its resolved `group:artifact` without the substitution arrow, so the
// label is stable across version bumps.
function label(body) {
    if (body.startsWith('project ')) return body;
    return resolveCoordinate(body)?.name ?? body;
}

// The fallback capture: `./gradlew :app:dependencies --configuration
// releaseRuntimeClasspath`, for if AGP ever stops writing sdkDependencies.txt.
export function parseGradleTree(text) {
    const lines = text.split('\n');
    const start = lines.findIndex(line => line.startsWith(`${GRADLE_CONFIGURATION} -`));
    if (start === -1) throw new Error(`the dump holds no \`${GRADLE_CONFIGURATION}\` section`);

    const found = new Map();
    // Every node's top-level ancestor: the direct dependency or included project
    // the coordinate enters the build through.
    const roots = [];
    let seenTree = false;

    for (const line of lines.slice(start + 1)) {
        const match = line.match(TREE_LINE);
        if (!match) {
            // The section ends at the first blank line after the tree started;
            // everything before that is Gradle's own preamble.
            if (seenTree && !line.trim()) break;
            continue;
        }
        seenTree = true;

        const depth = match[1].length / 5;
        const { body, constraint, unresolved } = parseNode(match[2]);

        // A resolve that did not complete would be indistinguishable from a graph
        // with fewer dependencies in it.
        if (/FAILED/.test(body)) throw new Error(`Gradle could not resolve \`${body}\``);

        roots[depth] = depth === 0 ? label(body) : (roots[depth - 1] ?? label(body));
        roots.length = depth + 1;

        // A constraint declares a version for a module that may or may not be in
        // the graph; when it is, it is also printed as a dependency of its own.
        if (constraint || unresolved) continue;
        if (body.startsWith('project ')) continue;

        const coordinate = resolveCoordinate(body);
        if (!coordinate) continue;

        const key = `${coordinate.name}@${coordinate.version}`;
        const existing = found.get(key);
        if (existing) existing.declaredBy.add(roots[0]);
        else found.set(key, { ...coordinate, declaredBy: new Set([roots[0]]) });
    }

    if (!found.size) throw new Error('no Maven coordinates in the dump — did the resolve run?');

    return [...found.values()]
        .map(entry => ({
            name: entry.name,
            version: entry.version,
            // A resolved *runtime* classpath is by definition what ships.
            graph: 'runtime',
            declaredBy: [...entry.declaredBy].sort(compareStrings)
        }))
        .sort(byNameThenVersion);
}
