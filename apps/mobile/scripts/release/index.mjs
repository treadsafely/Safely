// Downloads an EAS release build's artifacts; the GitHub side is gh, in release-assets.yml.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseArgs } from '../native-audit/shared/cli.mjs';
import { HttpClient } from '../native-audit/shared/http-client.mjs';
import {
    EasReleaseRuns,
    download,
    expoProject,
    gateSummary,
    releaseAssets,
    runUrl
} from './eas-release-runs.mjs';
import { assetSection } from './release-notes.mjs';

const USAGE = [
    'Usage: node apps/mobile/scripts/release/index.mjs <command> [options]',
    '',
    'stage   download the artifacts of the run that built one commit; exits 75 when',
    '        that run has not finished, which is not a failure',
    '  --commit <sha>       the merge commit the release documents (required)',
    '  --version <x.y.z>    the version its builds must carry (required)',
    '  --out <dir>          writes <dir>/assets/* and <dir>/section.md (required)',
    '  --attached <names>   comma-separated asset names already on the release',
    '',
    'plan    what EAS holds for one commit, in one line per asset',
    '  --commit <sha>       required',
    '  --version <x.y.z>    defaults to the version the builds carry',
    ''
].join('\n');

// Exits 0 staged, 75 not ready (EX_TEMPFAIL, not node's own 1 on a crash), 2 bad input.
const NOT_READY = 75;

const [command, ...argv] = process.argv.slice(2);
const { flag, option } = parseArgs(argv);

const http = new HttpClient();
// HttpClient's default 60 s abort covers the body, and the archives are huge.
const transfers = new HttpClient({ timeoutMs: 20 * 60 * 1000 });
const runs = new EasReleaseRuns(http);
const project = expoProject();

const mib = bytes => `${(bytes / 1048576).toFixed(1)} MiB`;

async function runStage() {
    const sha = option('--commit');
    const version = option('--version');
    const outDir = option('--out');
    if (!sha || !version || !outDir) throw new Error('--commit, --version and --out are required');

    const attached = new Set(
        (option('--attached') ?? '')
            .split(',')
            .map(name => name.trim())
            .filter(Boolean)
    );

    const found = await runs.forCommit(sha);
    if (found.waiting) {
        console.log(`release-stage: ${found.waiting}`);
        return NOT_READY;
    }

    const assets = releaseAssets({ jobs: found.jobs, version });
    const assetDir = join(outDir, 'assets');
    mkdirSync(assetDir, { recursive: true });

    for (const asset of assets) {
        if (attached.has(asset.name)) {
            console.log(`release-stage: ${asset.name} is already attached`);
            continue;
        }
        const size = await download(transfers, asset.url, join(assetDir, asset.name));
        console.log(`release-stage: ${asset.name} — ${mib(size)}`);
    }

    writeFileSync(
        join(outDir, 'section.md'),
        `${assetSection({ project, ...found, version, sha, assets })}\n`
    );
    console.log(`release-stage: run ${found.run.id} staged in ${outDir}`);
    return 0;
}

async function runPlan() {
    const sha = option('--commit');
    if (!sha) throw new Error('--commit is required');

    const found = await runs.forCommit(sha);
    if (found.waiting) {
        console.log(`release-plan: ${found.waiting}`);
        return 0;
    }

    const version = option('--version') ?? found.jobs.get('build_ios').turtleBuild.appVersion;
    const assets = releaseAssets({ jobs: found.jobs, version });
    console.log(`release-plan: run ${found.run.id} — ${runUrl(project, found.run.id)}`);
    console.log(`release-plan: gate says ${gateSummary(found.jobs) || '(no summary)'}`);
    for (const asset of assets) console.log(`  ${asset.name}`);
    return 0;
}

const SCOPE = { stage: 'release-stage', plan: 'release-plan' };
const COMMANDS = { stage: runStage, plan: runPlan };
const HELP = new Set(['help', '--help', '-h']);

if (HELP.has(command) || flag('--help') || flag('-h')) {
    console.log(USAGE);
    process.exit(0);
}

if (!(command in COMMANDS)) {
    console.error(`release: pick a command\n\n${USAGE}`);
    process.exit(2);
}

try {
    process.exitCode = await COMMANDS[command]();
} catch (error) {
    console.error(`${SCOPE[command]}: ${error.message}`);
    process.exit(2);
}
