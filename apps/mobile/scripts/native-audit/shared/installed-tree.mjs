import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { readDirs } from './util.mjs';

// pnpm keeps every package under a content-addressed snapshot directory, so a
// package is reached as `.pnpm/<snapshot>/node_modules/<name>` rather than by a
// predictable path.
export function pnpmPackages(repoRoot) {
    const pnpmRoot = join(repoRoot, 'node_modules/.pnpm');
    const packages = [];
    for (const snapshot of readDirs(pnpmRoot)) {
        const nested = join(pnpmRoot, snapshot, 'node_modules');
        for (const entry of readDirs(nested)) {
            const names = entry.startsWith('@')
                ? readDirs(join(nested, entry)).map(scoped => `${entry}/${scoped}`)
                : [entry];
            for (const name of names) packages.push({ name, path: join(nested, name) });
        }
    }
    return packages;
}

export function reactNativeDirs(repoRoot) {
    const pnpmRoot = join(repoRoot, 'node_modules/.pnpm');
    return readDirs(pnpmRoot)
        .filter(snapshot => snapshot.startsWith('react-native@'))
        .map(snapshot => join(pnpmRoot, snapshot, 'node_modules/react-native'))
        .filter(existsSync);
}
