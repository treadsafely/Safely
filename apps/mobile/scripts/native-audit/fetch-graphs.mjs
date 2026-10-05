// Downloads what an EAS build captured, and nothing else. Separate from
// index.mjs so the process holding EXPO_TOKEN loads no parser and no advisory
// client; parsing runs in a later step, without the token. Output names are
// fixed because `parse` reads them. See .claude/rules/dependency-security.md.
//
// Exit codes: 0 ok · 2 bad input, no credentials, or an unreachable API.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { EasBuildRecord } from './eas/build-record.mjs';
import { parseArgs } from './shared/cli.mjs';
import { HttpClient } from './shared/http-client.mjs';

const USAGE = [
    'Usage: node apps/mobile/scripts/native-audit/fetch-graphs.mjs --out <dir> [options]',
    '',
    '  --out <dir>          where to write the capture (required)',
    '  --ios <build-id>     download this build`s ios/Podfile.lock',
    '  --android <build-id> download this build`s sdkDependencies.txt',
    '  --aab <build-id>     download this bundle build`s dependencies.pb',
    ''
].join('\n');

// What each build captures, under the names `parse` reads back.
const CAPTURE = {
    ios: { file: 'Podfile.lock', record: 'build-ios.json' },
    android: { file: 'sdkDependencies.txt', record: 'build-android.json' },
    aab: { file: 'dependencies.pb', record: 'build-aab.json' }
};

const { flag, option } = parseArgs(process.argv.slice(2));

if (flag('--help') || flag('-h')) {
    console.log(USAGE);
    process.exit(0);
}

const outDir = option('--out');
const wanted = Object.keys(CAPTURE).filter(name => option(`--${name}`));

try {
    if (!outDir) throw new Error('--out is required');
    if (!wanted.length)
        throw new Error(
            `pass at least one of ${Object.keys(CAPTURE)
                .map(name => `--${name}`)
                .join(', ')}`
        );

    const record = new EasBuildRecord(new HttpClient());
    mkdirSync(outDir, { recursive: true });

    for (const capture of wanted) {
        const { file, record: recordName } = CAPTURE[capture];
        const build = await record.byId(option(`--${capture}`));

        writeFileSync(join(outDir, recordName), `${JSON.stringify(build, null, 4)}\n`);
        const { size, name } = await record.downloadArtifacts(build, join(outDir, file));

        console.log(
            `eas-build-record: ${build.id} ${build.platform} ${build.status} ` +
                `profile=${build.buildProfile} v${build.appVersion} build ${build.appBuildVersion} — ` +
                `${name}, ${(size / 1024).toFixed(0)} KiB -> ${join(outDir, file)}`
        );
    }
} catch (error) {
    console.error(`eas-build-record: ${error.message}`);
    process.exit(2);
}
