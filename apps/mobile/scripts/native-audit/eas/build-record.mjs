import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { queryExpo } from './api.mjs';

// The same fields `eas build:view --json` prints, so the record this writes is
// interchangeable with it as `parse --build-meta` input.
const BUILD_QUERY = `
  query BuildById($buildId: ID!) {
    builds {
      byId(buildId: $buildId) {
        id
        status
        platform
        buildProfile
        appVersion
        appBuildVersion
        gitCommitHash
        createdAt
        artifacts {
          buildUrl
          applicationArchiveUrl
          buildArtifactsUrl
        }
      }
    }
  }
`;

// Turns a build id into its record and the artifacts bundle `buildArtifactPaths`
// produced, without eas-cli.
//
// Measured on a real workflow run: eas-cli is not on the worker's PATH, so it
// has to be installed by npx first (22 s), and `build:view` then resolves a
// `ProjectId` context out of the app config — which needs the workspace
// installed to evaluate app.config.js. A security gate should not need a 100 MB
// CLI and a full `pnpm install` to turn a build id into a URL. `EXPO_TOKEN` is
// present in the EAS environment, also measured, so one GraphQL call does it.
export class EasBuildRecord {
    constructor(http, { token = process.env.EXPO_TOKEN } = {}) {
        this.http = http;
        this.token = token;
    }

    async byId(buildId) {
        const data = await queryExpo(this.http, {
            label: `expo build ${buildId}`,
            query: BUILD_QUERY,
            variables: { buildId },
            token: this.token
        });

        const build = data?.builds?.byId;
        if (!build) throw new Error(`no build ${buildId} — is the token scoped to this project?`);
        return build;
    }

    // A single captured path arrives verbatim, not archived — measured: one
    // `buildArtifactPaths` entry comes back as `artifacts-<build id>.<its own
    // extension>`. Two or more would arrive as an archive, which nothing here
    // unpacks; `parse` would then reject the file loudly.
    async downloadArtifacts(build, path) {
        const url = build.artifacts?.buildArtifactsUrl;
        // No bundle means `buildArtifactPaths` matched nothing, which for this
        // gate is a failure and not an empty graph.
        if (!url)
            throw new Error(
                `build ${build.id} has no buildArtifactsUrl — buildArtifactPaths matched nothing`
            );

        const response = await this.http.withRetries(`artifacts ${build.id}`, () =>
            this.http.request(url)
        );
        const bytes = Buffer.from(await response.arrayBuffer());
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, bytes);
        return { size: bytes.length, name: new URL(url).pathname.split('/').pop() };
    }
}
