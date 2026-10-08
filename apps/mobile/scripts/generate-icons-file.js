const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../../packages/ux/src/shared/assets/icons');
const OUT = path.resolve(__dirname, '../src/shared/ui/Icon/icons.ts');

const POSIX_SEP = '/';
const HEADER = `/* eslint-disable */\n// Generated file. Do not edit by hand.\n`;

function existsDir(p) {
    try {
        return fs.statSync(p).isDirectory();
    } catch {
        return false;
    }
}

function asPosix(relPath) {
    return relPath.split(path.sep).join(POSIX_SEP);
}

function stripSvg(name) {
    return name.replace(/\.svg$/i, '');
}

function makePascalIdentifier(name) {
    const base = stripSvg(String(name));
    const parts = base.split(/[^a-zA-Z0-9]+/g).filter(Boolean);
    return parts.map(p => p.slice(0, 1).toUpperCase() + p.slice(1)).join('');
}

function inferDefaultSize(relPosixPath) {
    const pieces = relPosixPath.split(POSIX_SEP);
    const topFolder = Number(pieces[0]);
    if (Number.isFinite(topFolder) && topFolder > 0) return topFolder;

    const filename = pieces[pieces.length - 1] || '';
    const base = stripSvg(filename);
    const m = base.match(/(\d+)\s*$/);
    const fromName = m ? Number(m[1]) : NaN;
    if (Number.isFinite(fromName) && fromName > 0) return fromName;

    return undefined;
}

async function listSvgRelativePaths(baseDir, rel = '.') {
    const abs = path.join(baseDir, rel);
    const items = await fsp.readdir(abs, { withFileTypes: true });

    const out = [];

    for (const it of items) {
        const relItem = path.join(rel, it.name);

        if (it.isDirectory()) {
            out.push(...(await listSvgRelativePaths(baseDir, relItem)));
            continue;
        }

        if (it.isFile() && /\.svg$/i.test(it.name)) {
            // exclude random .ts and other files
            out.push(relItem);
        }
    }

    return out;
}

function buildTsFile(svgRelPaths) {
    const relPosix = svgRelPaths
        .map(asPosix)
        .filter(p => !/\/?index\.ts$/i.test(p))
        .sort((a, b) => a.localeCompare(b));

    const imports = [];
    const exports = [];

    for (const rel of relPosix) {
        const fileBase = stripSvg(path.posix.basename(rel));
        const iconName = makePascalIdentifier(fileBase);
        const importId = `${iconName}Svg`;

        imports.push(`import ${importId} from '@safely/ux/assets/icons/${rel}';`);

        const size = inferDefaultSize(rel);
        const sizeField = size ? `, size: ${size}` : '';
        exports.push(`export const ${iconName} = { image: ${importId}${sizeField} } as const;`);
    }

    return [HEADER, imports.join('\n'), '', exports.join('\n'), ''].join('\n');
}

async function ensureOutDir(filePath) {
    const dir = path.dirname(filePath);
    await fsp.mkdir(dir, { recursive: true });
}

async function run() {
    if (!existsDir(ROOT)) {
        throw new Error(`Icons directory not found: ${ROOT}`);
    }

    const svgList = await listSvgRelativePaths(ROOT);
    const ts = buildTsFile(svgList);

    await ensureOutDir(OUT);
    await fsp.writeFile(OUT, ts, 'utf8');

    console.log(`icons.ts generated at: ${path.relative(process.cwd(), OUT)}`);
}

if (require.main === module) {
    run().catch(err => {
        console.error(err);
        process.exitCode = 1;
    });
}
