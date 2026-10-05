import { assembleCoordinates } from './app-dependencies.mjs';

// `dependencies.pb` in an AAB: the same message in binary, numbered per bundletool's proto.
const APP_DEPENDENCIES = {
    library: 1,
    libraryDependencies: 2,
    moduleDependencies: 3,
    repository: 4
};
const LIBRARY = { mavenLibrary: 1, digests: 2, repoIndex: 3 };
const MAVEN_LIBRARY = { groupId: 1, artifactId: 2, version: 5 };
const DIGESTS = { sha256: 1 };
const LIBRARY_DEPENDENCIES = { libraryIndex: 1, libraryDepIndex: 2 };
const MODULE_DEPENDENCIES = { dependencyIndex: 2 };
// A oneof of MavenRepo | IvyRepo | UnityRepo, each holding its url in field 1.
const REPOSITORY_KINDS = [1, 2, 3];
const URL = 1;
// google.protobuf.Int32Value — an empty wrapper is index 0, not an unknown one.
const INT32_VALUE = 1;

const WIRE = { varint: 0, fixed64: 1, length: 2, fixed32: 5 };
const SHA256_BYTES = 32;

function varint(bytes, at) {
    let value = 0n;
    let shift = 0n;
    for (;;) {
        if (at >= bytes.length) throw new Error('truncated varint');
        const byte = bytes[at++];
        value |= BigInt(byte & 0x7f) << shift;
        if (!(byte & 0x80)) return [value, at];
        shift += 7n;
        if (shift > 63n) throw new Error('varint wider than 64 bits');
    }
}

// An unknown field is skipped by its wire type; an unknown wire type is fatal.
function* fieldsOf(bytes) {
    let at = 0;
    while (at < bytes.length) {
        const [key, afterKey] = varint(bytes, at);
        const field = Number(key >> 3n);
        switch (Number(key & 7n)) {
            case WIRE.length: {
                const [length, afterLength] = varint(bytes, afterKey);
                at = afterLength + Number(length);
                if (at > bytes.length) throw new Error(`truncated field ${field}`);
                yield [field, bytes.subarray(afterLength, at)];
                break;
            }
            case WIRE.varint: {
                const [value, next] = varint(bytes, afterKey);
                at = next;
                yield [field, Number(value)];
                break;
            }
            case WIRE.fixed64:
                at = afterKey + 8;
                yield [field, null];
                break;
            case WIRE.fixed32:
                at = afterKey + 4;
                yield [field, null];
                break;
            default:
                throw new Error(`unsupported wire type in field ${field} at byte ${at}`);
        }
    }
}

const all = (bytes, field) =>
    [...fieldsOf(bytes)].filter(([number]) => number === field).map(([, value]) => value);

const first = (bytes, field) => {
    for (const [number, value] of fieldsOf(bytes)) if (number === field) return value;
    return undefined;
};

const string = value => (Buffer.isBuffer(value) ? value.toString('utf8') : null);

// A repeated int32 is packed by default, but a writer need not pack it.
const int32s = (bytes, field) =>
    all(bytes, field).flatMap(value => {
        if (!Buffer.isBuffer(value)) return typeof value === 'number' ? [value] : [];
        const values = [];
        let at = 0;
        while (at < value.length) {
            const [entry, next] = varint(value, at);
            at = next;
            values.push(Number(entry));
        }
        return values;
    });

// Anything but 32 bytes was misread, and a wrong digest is worse than none.
function digest(digests) {
    const sha256 = digests && first(digests, DIGESTS.sha256);
    if (!Buffer.isBuffer(sha256) || sha256.length !== SHA256_BYTES) return null;
    return sha256.toString('hex');
}

function repositoryUrls(message) {
    return all(message, APP_DEPENDENCIES.repository).map(repository => {
        for (const kind of REPOSITORY_KINDS) {
            const repo = first(repository, kind);
            if (Buffer.isBuffer(repo)) return string(first(repo, URL));
        }
        return null;
    });
}

export function parseAppDependencies(bytes) {
    const repositories = repositoryUrls(bytes);

    const libraries = all(bytes, APP_DEPENDENCIES.library).map(library => {
        const maven = first(library, LIBRARY.mavenLibrary);
        const wrapper = first(library, LIBRARY.repoIndex);
        const repo = Buffer.isBuffer(wrapper) ? Number(first(wrapper, INT32_VALUE) ?? 0) : null;
        const group = maven && string(first(maven, MAVEN_LIBRARY.groupId));
        const artifact = maven && string(first(maven, MAVEN_LIBRARY.artifactId));
        return {
            name: group && artifact ? `${group}:${artifact}` : null,
            version: (maven && string(first(maven, MAVEN_LIBRARY.version))) ?? null,
            sha256: digest(first(library, LIBRARY.digests)),
            repository: repo === null ? null : (repositories[repo] ?? null)
        };
    });

    if (!libraries.length) throw new Error('dependencies.pb holds no `library` records');

    const edges = new Map();
    for (const record of all(bytes, APP_DEPENDENCIES.libraryDependencies)) {
        edges.set(
            Number(first(record, LIBRARY_DEPENDENCIES.libraryIndex) ?? 0),
            int32s(record, LIBRARY_DEPENDENCIES.libraryDepIndex)
        );
    }

    const roots = all(bytes, APP_DEPENDENCIES.moduleDependencies).flatMap(record =>
        int32s(record, MODULE_DEPENDENCIES.dependencyIndex)
    );

    return assembleCoordinates({ libraries, edges, roots });
}

// The text form starts with a comment or a `library {` block.
export const looksBinary = bytes => bytes.length > 0 && bytes[0] !== 0x23 && bytes[0] !== 0x6c;
