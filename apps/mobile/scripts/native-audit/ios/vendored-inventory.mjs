import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { reactNativeDirs } from '../shared/installed-tree.mjs';
import { compareStrings } from '../shared/util.mjs';

// Reported, never gated: what a `--pods` run replaces. react-native 0.85 folds
// boost, glog, RCT-Folly and friends into one prebuilt ReactNativeDependencies
// pod, so these versions are indicative and a resolved Podfile.lock is the
// authoritative record.
export class VendoredPodInventory {
    constructor(repoRoot) {
        this.repoRoot = repoRoot;
    }

    collect() {
        const inventory = [];
        for (const rn of reactNativeDirs(this.repoRoot)) {
            const podspecs = join(rn, 'third-party-podspecs');
            for (const file of existsSync(podspecs) ? readdirSync(podspecs) : []) {
                if (!file.endsWith('.podspec')) continue;
                const text = readFileSync(join(podspecs, file), 'utf8');
                const version = text.match(/version\s*=\s*['"]([0-9][^'"]*)['"]/);
                inventory.push({
                    name: file.replace(/\.podspec$/, ''),
                    version: version?.[1] ?? 'from react-native'
                });
            }
            const hermes = join(rn, 'sdks/.hermesversion');
            if (existsSync(hermes))
                inventory.push({ name: 'hermes', version: readFileSync(hermes, 'utf8').trim() });
        }
        return inventory.sort((a, b) => compareStrings(a.name, b.name));
    }
}
