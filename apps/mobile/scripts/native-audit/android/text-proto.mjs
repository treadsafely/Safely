// A minimal reader for protobuf text format, which is all `sdkDependencies.txt`
// is: top-level records, one level of nesting, no repeated blocks inside a record.
// Nested blocks are flattened, because no key in that schema is ambiguous once
// flattened.
export function parseTextProto(text) {
    const records = [];
    let current = null;
    let depth = 0;

    for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;

        const open = line.match(/^([a-zA-Z0-9_]+) \{$/);
        if (depth === 0) {
            if (!open) continue;
            current = { name: open[1], fields: [], blocks: new Set() };
            depth = 1;
        } else if (open) {
            current.blocks.add(open[1]);
            depth += 1;
        } else if (line === '}') {
            depth -= 1;
            if (depth === 0) {
                records.push(current);
                current = null;
            }
        } else {
            const scalar = line.match(/^([a-zA-Z0-9_]+): (.*)$/);
            if (scalar) current.fields.push([scalar[1], scalar[2]]);
        }
    }

    return records;
}

const unquote = value => (value?.startsWith('"') ? value.slice(1, -1) : value);

export const field = (record, key) => unquote(record.fields.find(([name]) => name === key)?.[1]);

export const fields = (record, key) =>
    record.fields.filter(([name]) => name === key).map(([, value]) => unquote(value));

// An empty wrapper block (`repo_index { }`) is a value, not an absence.
export const hasBlock = (record, key) => record.blocks.has(key);

// The digests are raw bytes written in protobuf text format's escaping: octal for
// anything non-printable, backslash pairs for the rest. Decoding them is what
// turns this file into the only record of *which* artifact shipped, as opposed to
// which version was asked for.
export function decodeDigest(literal) {
    if (literal === undefined) return null;
    const bytes = [];
    for (let index = 0; index < literal.length; index++) {
        if (literal[index] !== '\\') {
            bytes.push(literal.charCodeAt(index));
            continue;
        }
        const octal = literal.slice(index + 1).match(/^[0-7]{1,3}/);
        if (octal) {
            bytes.push(parseInt(octal[0], 8));
            index += octal[0].length;
            continue;
        }
        const escape = { a: 7, b: 8, f: 12, n: 10, r: 13, t: 9, v: 11 }[literal[index + 1]];
        bytes.push(escape ?? literal.charCodeAt(index + 1));
        index += 1;
    }
    // Anything but 32 bytes means the escaping was misread, and a wrong digest is
    // worse than none.
    if (bytes.length !== 32 || bytes.some(byte => byte > 0xff)) return null;
    return bytes.map(byte => byte.toString(16).padStart(2, '0')).join('');
}
