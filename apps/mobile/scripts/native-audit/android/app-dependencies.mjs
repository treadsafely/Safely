import { byNameThenVersion, compareStrings } from '../shared/util.mjs';

// Walks the edge list from every root, labelling each library it reaches. The
// roots are the app module's direct dependencies, which is the address of any fix.
function attribute(libraries, edges, roots) {
    const declaredBy = libraries.map(() => new Set());
    for (const root of roots) {
        const label = libraries[root]?.name;
        if (!label) continue;
        const queue = [root];
        const seen = new Set(queue);
        while (queue.length) {
            const index = queue.shift();
            declaredBy[index].add(label);
            for (const next of edges.get(index) ?? []) {
                if (seen.has(next)) continue;
                seen.add(next);
                queue.push(next);
            }
        }
    }
    return declaredBy;
}

// Both forms of AGP's `AppDependencies` end here; every edge is an index into the list.
export function assembleCoordinates({ libraries, edges, roots }) {
    const declaredBy = attribute(libraries, edges, roots);

    return libraries
        .map((library, index) => ({
            name: library.name,
            version: library.version,
            // Both forms are written for the release variant only.
            graph: 'runtime',
            declaredBy: [...declaredBy[index]].sort(compareStrings),
            sha256: library.sha256,
            repository: library.repository
        }))
        .filter(entry => entry.name && entry.version)
        .sort(byNameThenVersion);
}
