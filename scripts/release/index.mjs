// Checks a release branch against .claude/rules/release.md; prints key=value lines for $GITHUB_OUTPUT.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
    checkRelease,
    OutsideSchemeError,
    parseBranch,
    parseVersion,
    PLATFORMS,
    tagOf
} from './release-scheme.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const USAGE = [
    'Usage: node scripts/release/index.mjs <command> [options]',
    '',
    'check   --branch <name> --base <git rev> [--platform <p>] [--allow-released]',
    '        the branch against both package.json files and the released tags',
    '  --base             master before the merge: HEAD^1 on a merge, the merge-base on a branch',
    '  --platform         mobile | desktop — compare only that platform with its released tags',
    '  --allow-released   a version already tagged prints <p>-released=true instead of failing',
    '        prints mobile=, desktop= (empty when out of scope) and, per checked platform,',
    '        <p>-tag=, <p>-previous-tag=, <p>-released=',
    'scope   --branch <name>                  mobile=, desktop= from the name alone, no git',
    'tag     --platform <p> --version <x.y.z> the release tag of that version',
    '',
    'Exit codes: 0 ok, 1 the release breaks the scheme, 2 bad input or git failure,',
    '3 the branch is outside the scheme — no release at all.'
].join('\n');

const OUTSIDE_SCHEME = 3;

class InputError extends Error {}

const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });

const versionsAt = read =>
    Object.fromEntries(PLATFORMS.map(p => [p, JSON.parse(read(`apps/${p}/package.json`)).version]));

const print = outputs => {
    for (const [key, value] of Object.entries(outputs)) console.log(`${key}=${value}`);
};

function requireOptions(values, ...names) {
    const missing = names.filter(name => !values[name]);
    if (missing.length) throw new InputError(`missing --${missing.join(', --')}\n\n${USAGE}`);
    if (values.platform && !PLATFORMS.includes(values.platform))
        throw new InputError(`unknown platform ${values.platform}`);
}

function runCheck(values) {
    requireOptions(values, 'branch', 'base');
    let head, base, tags;
    try {
        head = versionsAt(path => readFileSync(resolve(ROOT, path), 'utf8'));
        base = versionsAt(path => git(['show', `${values.base}:${path}`]));
        tags = git(['tag', '--list', 'v*']).split('\n').filter(Boolean);
    } catch (error) {
        throw new InputError(`cannot read the versions or tags: ${error.message}`);
    }

    const result = checkRelease({
        branch: values.branch,
        head,
        base,
        tags,
        platform: values.platform,
        allowReleased: values['allow-released']
    });
    if (result.errors.length) {
        for (const error of result.errors) console.error(`release: ${error}`);
        return 1;
    }
    print(result.outputs);
    return 0;
}

function runScope(values) {
    requireOptions(values, 'branch');
    const scope = parseBranch(values.branch);
    print(Object.fromEntries(PLATFORMS.map(p => [p, scope[p] ?? ''])));
    return 0;
}

function runTag(values) {
    requireOptions(values, 'platform', 'version');
    if (!parseVersion(values.version)) throw new InputError(`${values.version} is not x.y.z`);
    console.log(tagOf(values.platform, values.version));
    return 0;
}

const COMMANDS = { check: runCheck, scope: runScope, tag: runTag };

function main() {
    let parsed;
    try {
        parsed = parseArgs({
            allowPositionals: true,
            options: {
                branch: { type: 'string' },
                base: { type: 'string' },
                platform: { type: 'string' },
                version: { type: 'string' },
                'allow-released': { type: 'boolean' },
                help: { type: 'boolean', short: 'h' }
            }
        });
    } catch (error) {
        console.error(`release: ${error.message}\n\n${USAGE}`);
        return 2;
    }

    const { positionals, values } = parsed;
    if (values.help) {
        console.log(USAGE);
        return 0;
    }
    const command = COMMANDS[positionals[0]];
    if (!command) {
        console.error(USAGE);
        return 2;
    }

    try {
        return command(values);
    } catch (error) {
        if (error instanceof OutsideSchemeError) {
            console.error(`release: ${error.message}`);
            return OUTSIDE_SCHEME;
        }
        // Never 1: a crash must not read as a release that breaks the scheme.
        console.error(`release: ${error instanceof InputError ? error.message : error.stack}`);
        return 2;
    }
}

process.exitCode = main();
