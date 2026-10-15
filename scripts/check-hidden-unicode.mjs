// Hidden Unicode gate.
//
// Fails when a tracked text file contains a Unicode Default_Ignorable code
// point: bidi controls, zero-width and other format characters, variation
// selectors, Hangul fillers and Tag characters (U+E0000–U+E007F, the classic
// "ASCII smuggling" carrier). Also any other format (Cf), private-use,
// unassigned or control character except tab and CRLF, and U+2028/U+2029,
// which end a line in JS while an editor may show one. They render as nothing
// (or reorder or break what is shown), so a reviewer
// sees different code than the compiler does ("Trojan Source",
// CVE-2021-42574), and a model reading the diff — the Claude review job runs
// next to ANTHROPIC_API_KEY — sees instructions a human never saw.
//
// Run by the `build-and-test` job in .github/workflows/ci.yml and by
// `pnpm check:unicode` locally. Scans every tracked file rather than the PR
// diff: it takes well under a second, and a diff-only scan would let a
// character through on any PR that bypassed CI.
//
// Exit codes: 0 clean · 1 hidden characters or an unscannable file found.

import { execFileSync } from 'node:child_process';
import { readFileSync, readlinkSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const HIDDEN = /(?!\t)[\p{Default_Ignorable_Code_Point}\p{Cf}\p{Co}\p{Cn}\p{Zl}\p{Zp}\p{Cc}]/gu;

// A joiner between two pictographs is an emoji ZWJ sequence (UTS #51, e.g. the
// polar bear in portfolio-meta.ts): it renders as one visible glyph, so it
// cannot hide anything. The optional middle part allows a VS16 or a skin tone.
const EMOJI_ZWJ =
    /(?<=\p{Extended_Pictographic}(?:\u{FE0F}|[\u{1F3FB}-\u{1F3FF}])?)\u{200D}(?=\p{Extended_Pictographic})/uy;

// VS15/VS16 pick text or emoji presentation of the character before them
// (`↔️`, keycap `1️⃣`). Only a single one directly after an emoji-capable
// character passes, so a run of selectors cannot carry data.
const EMOJI_PRESENTATION = /(?<=\p{Emoji})[\u{FE0E}\u{FE0F}]/uy;

const matchesAt = (regex, line, index) => {
    regex.lastIndex = index;
    return regex.test(line);
};

const isEmojiSequencePart = (line, index) =>
    matchesAt(EMOJI_ZWJ, line, index) || matchesAt(EMOJI_PRESENTATION, line, index);

const NAMES = {
    0x200b: 'ZERO WIDTH SPACE',
    0x200c: 'ZERO WIDTH NON-JOINER',
    0x200d: 'ZERO WIDTH JOINER',
    0x200e: 'LEFT-TO-RIGHT MARK',
    0x200f: 'RIGHT-TO-LEFT MARK',
    0x202a: 'LEFT-TO-RIGHT EMBEDDING',
    0x202b: 'RIGHT-TO-LEFT EMBEDDING',
    0x202c: 'POP DIRECTIONAL FORMATTING',
    0x202d: 'LEFT-TO-RIGHT OVERRIDE',
    0x202e: 'RIGHT-TO-LEFT OVERRIDE',
    0x2060: 'WORD JOINER',
    0x2066: 'LEFT-TO-RIGHT ISOLATE',
    0x2067: 'RIGHT-TO-LEFT ISOLATE',
    0x2068: 'FIRST STRONG ISOLATE',
    0x2069: 'POP DIRECTIONAL ISOLATE',
    0xfeff: 'ZERO WIDTH NO-BREAK SPACE / BOM',
    0x00ad: 'SOFT HYPHEN',
    0x034f: 'COMBINING GRAPHEME JOINER',
    0x061c: 'ARABIC LETTER MARK',
    0x180e: 'MONGOLIAN VOWEL SEPARATOR',
    0x3164: 'HANGUL FILLER',
    0x000d: 'CARRIAGE RETURN without LINE FEED',
    0x001b: 'ESCAPE',
    0x0085: 'NEXT LINE',
    0x2028: 'LINE SEPARATOR',
    0x2029: 'PARAGRAPH SEPARATOR'
};

const rangeName = codePoint => {
    if (codePoint >= 0xe0000 && codePoint <= 0xe007f) return 'TAG CHARACTER';
    if (codePoint >= 0xfe00 && codePoint <= 0xfe0f) return 'VARIATION SELECTOR';
    if (codePoint >= 0xe0100 && codePoint <= 0xe01ef) return 'VARIATION SELECTOR SUPPLEMENT';
    const char = String.fromCodePoint(codePoint);
    if (/\p{Cc}/u.test(char)) return 'CONTROL CHARACTER';
    if (/\p{Co}/u.test(char)) return 'PRIVATE USE CHARACTER';
    if (/\p{Cn}/u.test(char)) return 'UNASSIGNED CODE POINT';
    return 'INVISIBLE FORMAT CHARACTER';
};

const describe = codePoint => {
    const hex = codePoint.toString(16).toUpperCase().padStart(4, '0');
    return `U+${hex} ${NAMES[codePoint] ?? rangeName(codePoint)}`;
};

const SYMLINK_MODE = '120000';
const GITLINK_MODE = '160000';

const trackedEntries = () => {
    const output = execFileSync('git', ['ls-files', '--stage', '-z'], {
        cwd: ROOT,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024
    });
    const modes = new Map();
    for (const record of output.split('\0')) {
        if (!record) continue;
        modes.set(record.slice(record.indexOf('\t') + 1), record.slice(0, record.indexOf(' ')));
    }
    return modes;
};

const BINARY_EXTENSIONS = new Set([
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
    'ico',
    'icns',
    'ttf',
    'otf',
    'woff',
    'woff2',
    'jar'
]);

// Git, and GitHub's diff with it, calls a file binary on a NUL in its first 8000 bytes.
const GIT_BINARY_PROBE = 8000;

const isBinary = (path, buffer) =>
    BINARY_EXTENSIONS.has(extname(path).slice(1).toLowerCase()) &&
    buffer.subarray(0, GIT_BINARY_PROBE).includes(0);

const isUtf16 = buffer =>
    (buffer[0] === 0xff && buffer[1] === 0xfe) || (buffer[0] === 0xfe && buffer[1] === 0xff);

// A diff shows a symlink as its target path, so that text is what gets scanned, not the file behind it.
const readTracked = (path, mode) => {
    const absolute = resolve(ROOT, path);
    try {
        return mode === SYMLINK_MODE ? Buffer.from(readlinkSync(absolute)) : readFileSync(absolute);
    } catch (error) {
        // Deleted in the working tree but still in the index: nothing to scan.
        if (error.code === 'ENOENT') return undefined;
        throw error;
    }
};

const hiddenIn = text =>
    [...text.matchAll(HIDDEN)].filter(match => !isEmojiSequencePart(text, match.index));

const findings = [];

for (const [path, mode] of trackedEntries()) {
    for (const match of hiddenIn(path)) {
        findings.push({
            path,
            message: `hidden character ${describe(match[0].codePointAt(0))} in the file name`
        });
    }

    // A submodule is a commit id here; its files are not part of this repository's diff.
    if (mode === GITLINK_MODE) continue;

    let buffer;
    try {
        buffer = readTracked(path, mode);
    } catch (error) {
        findings.push({ path, message: `cannot be read (${error.code ?? error.message})` });
        continue;
    }
    if (buffer === undefined || isBinary(path, buffer)) continue;

    // A tool or model may still read it as text, so skipping it would let one NUL hide a whole file.
    if (buffer.includes(0) || isUtf16(buffer)) {
        findings.push({
            path,
            message: 'NUL byte or UTF-16 outside a known binary format, cannot be scanned'
        });
        continue;
    }

    const lines = buffer.toString('utf8').split('\n');
    lines.forEach((line, index) => {
        for (const match of hiddenIn(line.endsWith('\r') ? line.slice(0, -1) : line)) {
            findings.push({
                path,
                line: index + 1,
                column: match.index + 1,
                message: `hidden character ${describe(match[0].codePointAt(0))}`
            });
        }
    });
}

if (findings.length === 0) {
    console.log('No hidden Unicode characters in tracked files.');
    process.exit(0);
}

const annotate = Boolean(process.env.GITHUB_ACTIONS);

// Same escaping as @actions/core: a newline in a file name would otherwise start a new workflow command.
const escapeData = text => text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escapeProperty = text => escapeData(text).replace(/:/g, '%3A').replace(/,/g, '%2C');

const printable = text =>
    text.replace(
        /[\p{Cc}\p{Default_Ignorable_Code_Point}]/gu,
        char => `\\u{${char.codePointAt(0).toString(16)}}`
    );

for (const { path, line, column, message } of findings) {
    const position = line === undefined ? '' : `:${line}:${column}`;
    const annotationPosition = line === undefined ? '' : `,line=${line},col=${column}`;
    console.error(
        annotate
            ? `::error file=${escapeProperty(path)}${annotationPosition}::${escapeData(message)}`
            : `${printable(path)}${position} ${message}`
    );
}

console.error(
    `\n${findings.length} hidden Unicode character(s) or unscannable file(s) found. Remove them, or write the code point as an escape (e.g. \\u200D) if it is intentional.`
);
process.exit(1);
