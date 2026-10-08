import { createWriteStream, mkdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { queryExpo } from '../native-audit/eas/api.mjs';

// A run started with `eas workflow:run` carries no ref, so the filter skips it.
const GIT_REF = 'refs/heads/master';
const WORKFLOW_FILE = 'build-and-distribute.yml';
const RUNS_PER_PAGE = 25;

// Not the run's own status: an e2e flake must not hold back a release.
export const REQUIRED_JOBS = ['build_ios', 'build_android', 'build_android_play', 'security_gate'];

const GRAPHS_ARTIFACT = 'native-dependency-graphs';

const RUNS_QUERY = `
  query MasterRuns($appId: String!, $ref: String!, $first: Int!) {
    app {
      byId(appId: $appId) {
        workflowRunsPaginated(first: $first, filter: { requestedGitRef: $ref }) {
          edges {
            node {
              id
              status
              createdAt
              triggerEventType
              gitCommitHash
              workflow { fileName }
              jobs {
                key
                status
                outputs
                turtleBuild {
                  id
                  platform
                  buildProfile
                  appVersion
                  appBuildVersion
                  artifacts { applicationArchiveUrl buildArtifactsUrl }
                }
                turtleJobRun { artifacts { name filename downloadUrl fileSizeBytes } }
              }
            }
          }
        }
      }
    }
  }
`;

const require = createRequire(import.meta.url);

// app.config.js is the one place this EAS project is named.
export function expoProject() {
    const { expo } = require('../../app.config.js');
    return { appId: expo.extra.eas.projectId, owner: expo.owner, slug: expo.slug };
}

export const runUrl = ({ owner, slug }, runId) =>
    `https://expo.dev/accounts/${owner}/projects/${slug}/workflows/${runId}`;

const short = sha => sha.slice(0, 8);

const jobsOf = run => new Map(run.jobs.map(job => [job.key, job]));

// The build jobs' copy survives a run whose own field is empty.
const commitOf = run =>
    run.gitCommitHash ?? run.jobs.map(job => job.outputs?.git_commit_hash).find(Boolean) ?? null;

function describeWaiting(run, jobs) {
    const missing = REQUIRED_JOBS.map(
        key => `${key}: ${jobs.get(key)?.status ?? 'not in this run'}`
    );
    return `run ${run.id} is ${run.status} — ${missing.join(', ')}`;
}

export class EasReleaseRuns {
    constructor(http, { token = process.env.EXPO_TOKEN } = {}) {
        this.http = http;
        this.token = token;
    }

    // The newest run that built `sha` with every required job green.
    async forCommit(sha) {
        const { appId } = expoProject();
        const data = await queryExpo(this.http, {
            label: `expo runs for ${short(sha)}`,
            query: RUNS_QUERY,
            variables: { appId, ref: GIT_REF, first: RUNS_PER_PAGE },
            token: this.token
        });

        // A project the token cannot see must not read as a project with no runs.
        const page = data?.app?.byId?.workflowRunsPaginated;
        if (!Array.isArray(page?.edges))
            throw new Error(`no workflow runs for app ${appId} — is the token scoped to it?`);

        const runs = page.edges
            .map(edge => edge.node)
            .filter(run => run.workflow?.fileName === WORKFLOW_FILE && commitOf(run) === sha)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        if (!runs.length)
            return { waiting: `no push-triggered run for ${short(sha)} on ${GIT_REF} yet` };

        for (const run of runs) {
            const jobs = jobsOf(run);
            if (REQUIRED_JOBS.every(key => jobs.get(key)?.status === 'SUCCESS'))
                return { run, jobs };
        }

        return { waiting: describeWaiting(runs[0], jobsOf(runs[0])) };
    }
}

// What the release carries.
const BINARIES = [
    { job: 'build_ios', extension: 'ipa' },
    { job: 'build_android', extension: 'apk' },
    { job: 'build_android_play', extension: 'aab' }
];

const CAPTURED_GRAPHS = [
    { job: 'build_ios', name: 'ios-Podfile.lock' },
    { job: 'build_android', name: 'android-sdkDependencies.txt' },
    { job: 'build_android_play', name: 'android-dependencies.pb' }
];

function buildOf(jobs, key) {
    const build = jobs.get(key)?.turtleBuild;
    if (!build) throw new Error(`job ${key} carries no build`);
    return build;
}

// Published incomplete is worse than published late.
function urlOf(build, field, what) {
    const url = build.artifacts?.[field];
    if (!url) throw new Error(`build ${build.id} has no ${what}`);
    return url;
}

export function releaseAssets({ jobs, version }) {
    const assets = [];

    for (const { job, extension } of BINARIES) {
        const build = buildOf(jobs, job);
        if (build.appVersion !== version)
            throw new Error(
                `${job} built v${build.appVersion}, but the release is v${version} — wrong run matched`
            );
        assets.push({
            name: `safely-${version}-${build.appBuildVersion}.${extension}`,
            url: urlOf(build, 'applicationArchiveUrl', 'application archive'),
            platform: job,
            build
        });
    }

    for (const { job, name } of CAPTURED_GRAPHS) {
        const build = buildOf(jobs, job);
        assets.push({ name, url: urlOf(build, 'buildArtifactsUrl', 'captured graph'), build });
    }

    const gate = jobs.get('security_gate');
    const graphs = (gate?.turtleJobRun?.artifacts ?? []).find(
        artifact => artifact.name === GRAPHS_ARTIFACT
    );
    if (!graphs)
        throw new Error(
            `the gate uploaded no \`${GRAPHS_ARTIFACT}\` artifact — rerun the EAS workflow for this commit`
        );
    assets.push({ name: `native-graphs-${version}.tar.gz`, url: graphs.downloadUrl });

    return assets;
}

export const gateSummary = jobs => jobs.get('security_gate')?.outputs?.summary ?? '';

// Retried as a whole: a body that dies halfway has to start over.
export function download(http, url, path) {
    return http.withRetries(`download ${basename(path)}`, async () => {
        const response = await http.request(url);
        mkdirSync(dirname(path), { recursive: true });
        await pipeline(Readable.fromWeb(response.body), createWriteStream(path));
        return statSync(path).size;
    });
}
