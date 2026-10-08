import { existsSync, readdirSync, readFileSync } from 'node:fs';

export function readTextFile(path, label) {
    if (!existsSync(path)) throw new Error(`${label} not found: ${path}`);
    const text = readFileSync(path, 'utf8');
    if (!text.trim()) throw new Error(`${label} is empty: ${path}`);
    return text;
}

export function readBinaryFile(path, label) {
    if (!existsSync(path)) throw new Error(`${label} not found: ${path}`);
    const bytes = readFileSync(path);
    if (!bytes.length) throw new Error(`${label} is empty: ${path}`);
    return bytes;
}

export function readJsonFile(path, label) {
    try {
        return JSON.parse(readTextFile(path, label));
    } catch (error) {
        if (error instanceof SyntaxError) throw new Error(`${label} is not valid JSON: ${path}`);
        throw error;
    }
}

// `<` and `>` instead of localeCompare, per packages/core/src/utils/string.ts.
export const compareStrings = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export const byNameThenVersion = (a, b) =>
    compareStrings(a.name, b.name) || compareStrings(a.version, b.version);

export const readDirs = path => {
    if (!existsSync(path)) return [];
    return readdirSync(path, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
};

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export const startOfDay = date =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const isIsoDate = value =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value));

export const daysBetween = (from, to) =>
    Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);
