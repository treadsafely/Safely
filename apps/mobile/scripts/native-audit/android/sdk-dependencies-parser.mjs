import { assembleCoordinates } from './app-dependencies.mjs';
import { decodeDigest, field, fields, hasBlock, parseTextProto } from './text-proto.mjs';

// `android/app/build/outputs/sdk-dependencies/release/sdkDependencies.txt`, which
// the Android Gradle Plugin writes on every APK build.
export function parseSdkDependencies(text) {
    const records = parseTextProto(text);

    const repositories = records
        .filter(record => record.name === 'repositories')
        .map(record => field(record, 'url'));

    const libraries = records
        .filter(record => record.name === 'library')
        .map(record => {
            const group = field(record, 'groupId');
            const artifact = field(record, 'artifactId');
            // An Int32Value: index 0 is the empty block, so presence is the answer.
            const repo = hasBlock(record, 'repo_index')
                ? Number(field(record, 'value') ?? 0)
                : null;
            return {
                name: group && artifact ? `${group}:${artifact}` : null,
                version: field(record, 'version') ?? null,
                sha256: decodeDigest(field(record, 'sha256')),
                repository: repo === null ? null : (repositories[repo] ?? null)
            };
        });

    if (!libraries.length) throw new Error('sdkDependencies.txt holds no `library` records');

    const edges = new Map();
    for (const record of records.filter(record => record.name === 'library_dependencies')) {
        edges.set(
            Number(field(record, 'library_index')),
            fields(record, 'library_dep_index').map(Number)
        );
    }

    const roots = records
        .filter(record => record.name === 'module_dependencies')
        .flatMap(record => fields(record, 'dependency_index').map(Number));

    return assembleCoordinates({ libraries, edges, roots });
}
