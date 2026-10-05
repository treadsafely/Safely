import { existsSync } from 'node:fs';

import { byNameThenVersion, compareStrings, readJsonFile } from './util.mjs';

export const SCHEMA = 1;

export const androidCoordinatesDocument = ({
    label,
    source,
    capturedFrom,
    build,
    coordinates
}) => ({
    schema: SCHEMA,
    kind: 'android-coordinates',
    label,
    source,
    capturedFrom,
    build,
    coordinates
});

export const iosPodsDocument = ({ capturedFrom, cocoapods, build, pods }) => ({
    schema: SCHEMA,
    kind: 'ios-pods',
    source: 'ios/Podfile.lock',
    capturedFrom,
    cocoapods,
    build,
    pods
});

function readGraphFile(path, kind) {
    // The capture step failing silently is the likeliest reason this file is
    // missing, so the message says so rather than just naming the path.
    if (!existsSync(path))
        throw new Error(`${kind} not found: ${path} — did the capture step run?`);
    const payload = readJsonFile(path, kind);
    if (payload.kind !== kind)
        throw new Error(`${path} is a \`${payload.kind}\` file, expected \`${kind}\``);
    return payload;
}

// The resolved graph replaces the declared collector wholesale: same fields, same
// `graph` vocabulary, so nothing downstream can tell where the coordinates came
// from. An empty or malformed file is an error rather than an empty graph,
// because an empty graph reads as a clean one.
export function loadResolvedCoordinates(path) {
    const payload = readGraphFile(path, 'android-coordinates');
    const coordinates = (payload.coordinates ?? []).filter(
        entry => typeof entry.name === 'string' && entry.name.includes(':') && entry.version
    );
    if (!coordinates.length) throw new Error(`${path} holds no Maven coordinates`);
    return {
        build: payload.build,
        source: payload.source,
        // A file written before the gate read more than one graph names no artifact.
        label: payload.label ?? 'graph',
        coordinates: coordinates
            .map(entry => ({
                name: entry.name,
                version: String(entry.version),
                graph: entry.graph ?? 'runtime',
                declaredBy: entry.declaredBy ?? [],
                sha256: entry.sha256 ?? null
            }))
            .sort(byNameThenVersion)
    };
}

// A database answer is keyed by `name@version`, so two graphs become one subject each.
export function mergeResolvedCoordinates(graphs) {
    const merged = new Map();
    for (const graph of graphs) {
        for (const entry of graph.coordinates) {
            const key = `${entry.name}@${entry.version}`;
            const seen = merged.get(key);
            if (!seen) {
                merged.set(key, { ...entry, sources: [graph.label] });
                continue;
            }
            seen.sources.push(graph.label);
            seen.declaredBy = [...new Set([...seen.declaredBy, ...entry.declaredBy])].sort(
                compareStrings
            );
            seen.sha256 ??= entry.sha256;
            // If two graphs disagree, the claim that it ships wins.
            if (seen.graph !== entry.graph) seen.graph = 'runtime';
        }
    }
    return [...merged.values()].sort(byNameThenVersion);
}

// Only pods the parser marked `queryable` — the ones that came from a spec repo —
// carry a version a database can key on. Everything else is a `:path` pod
// versioned by its npm package, and it stays in the report as inventory.
export function loadResolvedPods(path) {
    const payload = readGraphFile(path, 'ios-pods');
    const pods = (payload.pods ?? []).filter(pod => typeof pod.name === 'string' && pod.version);
    if (!pods.length) throw new Error(`${path} holds no pods`);
    return {
        build: payload.build,
        cocoapods: payload.cocoapods,
        pods: pods
            .map(pod => ({
                name: pod.name,
                version: String(pod.version),
                graph: pod.graph ?? 'runtime',
                declaredBy: pod.declaredBy ?? [],
                queryable: Boolean(pod.queryable)
            }))
            .sort((a, b) => compareStrings(a.name, b.name))
    };
}

// The build record is the only thing that says *which* build a graph came from,
// and it is not in the graph itself — `eas build:view --json` supplies it.
export function readBuildMeta(path) {
    if (!path) return undefined;
    const payload = readJsonFile(path, 'build metadata');
    const build = Array.isArray(payload) ? payload[0] : payload;
    if (!build?.id) throw new Error('build metadata has no build id');
    return {
        id: build.id,
        platform: build.platform,
        profile: build.buildProfile,
        status: build.status,
        appVersion: build.appVersion,
        appBuildVersion: build.appBuildVersion,
        gitCommitHash: build.gitCommitHash,
        createdAt: build.createdAt
    };
}
