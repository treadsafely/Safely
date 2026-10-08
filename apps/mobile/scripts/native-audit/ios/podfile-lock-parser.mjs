import { compareStrings } from '../shared/util.mjs';

// Subspecs (`SDWebImage/Core`) are versioned with their parent, and no database
// keys a record by subspec.
const rootPod = name => name.split('/')[0];

// Which of the Podfile's own dependencies each pod hangs off — the iOS
// counterpart of the Android `declaredBy`, and the only thing that makes a
// finding on a transitive pod actionable: nanopb is only in the graph because a
// barcode scanner asks for MLKit.
function attribute(installed, edges, roots) {
    const declaredBy = new Map([...installed.keys()].map(name => [name, new Set()]));
    for (const root of roots) {
        if (!declaredBy.has(root)) continue;
        const queue = [root];
        const seen = new Set(queue);
        while (queue.length) {
            const current = queue.shift();
            declaredBy.get(current)?.add(root);
            for (const next of edges.get(current) ?? []) {
                if (seen.has(next)) continue;
                seen.add(next);
                queue.push(next);
            }
        }
    }
    return declaredBy;
}

// Podfile.lock is YAML, and this reads it without a YAML parser — four
// fixed-shape sections, two indentation levels, no quoting, no anchors.
export function parsePodfileLock(text) {
    let section = null;
    let repo = null;
    let pod = null;
    let cocoapods = null;
    const installed = new Map(); // pod -> resolved version, from PODS
    const edges = new Map(); // pod -> pods it depends on, from PODS
    const roots = new Set(); // pods the Podfile itself asks for, from DEPENDENCIES
    const fromRepo = new Map(); // pod -> spec repo, from SPEC REPOS
    const external = new Set(); // pods with a :path/:podspec source

    for (const line of text.split('\n')) {
        if (!line.trim()) continue;

        if (!/^\s/.test(line)) {
            section = line.replace(/:\s*$/, '');
            repo = null;
            pod = null;
            if (section.startsWith('COCOAPODS')) cocoapods = line.split(':')[1]?.trim() || null;
            continue;
        }

        const indent = line.match(/^ */)[0].length;
        const body = line.trim();

        if (section === 'PODS') {
            if (indent === 2) {
                // `- SDWebImage (5.21.0):` or `- SDWebImage/Core (5.21.0)`
                const entry = body.match(/^- (\S+) \(([^)]+)\):?$/);
                pod = entry ? rootPod(entry[1]) : null;
                if (pod) installed.set(pod, entry[2]);
            } else if (indent === 4 && pod) {
                // `- GoogleDataTransport (< 11.0, >= 9.4.1)` — a version
                // constraint, not a resolved version; only the name is wanted.
                const dependency = rootPod(body.replace(/^- /, '').split(' ')[0]);
                if (dependency !== pod) {
                    if (!edges.has(pod)) edges.set(pod, new Set());
                    edges.get(pod).add(dependency);
                }
            }
            continue;
        }

        if (section === 'DEPENDENCIES' && indent === 2) {
            // `- "ExpoImage (from `…/ExpoImage.podspec`)"` or `- MMKV (~> 2.0)`
            roots.add(rootPod(body.replace(/^- "?/, '').split(' ')[0]));
            continue;
        }

        if (section === 'SPEC REPOS') {
            if (indent === 2) repo = body.replace(/:$/, '');
            else if (indent === 4 && repo) fromRepo.set(rootPod(body.replace(/^- /, '')), repo);
            continue;
        }

        if (section === 'EXTERNAL SOURCES' && indent === 2)
            external.add(rootPod(body.replace(/:$/, '')));
    }

    if (!installed.size) throw new Error('Podfile.lock holds no PODS section');

    const declaredBy = attribute(installed, edges, roots);

    return {
        cocoapods,
        pods: [...installed.entries()]
            .map(([name, version]) => ({
                name,
                version,
                graph: 'runtime',
                declaredBy: [...(declaredBy.get(name) ?? [])].sort(compareStrings),
                // Only pods that came from a spec repo carry a version any
                // database can key on. Everything under EXTERNAL SOURCES is a
                // `:path` pod versioned by its npm package, and no database holds
                // a record for React-Core or ExpoModulesCore.
                source: fromRepo.get(name) ?? (external.has(name) ? 'external' : 'unknown'),
                queryable: fromRepo.has(name)
            }))
            .sort((a, b) => compareStrings(a.name, b.name))
    };
}
