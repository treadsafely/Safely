import { gateSummary, runUrl } from './eas-release-runs.mjs';

// The block appended under GitHub's generated notes.
export function assetSection({ project, run, jobs, version, sha, assets }) {
    const rows = assets
        .filter(asset => asset.platform)
        .map(
            ({ platform, build }) =>
                `| ${platform.replace('build_', '')} | \`${build.buildProfile}\` | v${build.appVersion} | ${build.appBuildVersion} |`
        );

    return [
        '### Build',
        '',
        '| Job | Profile | Version | Build |',
        '| --- | --- | --- | --- |',
        ...rows,
        '',
        `Native dependency gate: ${gateSummary(jobs) || 'see the EAS run'}`,
        '',
        'Resolved native graphs are attached as `ios-Podfile.lock`,',
        '`android-sdkDependencies.txt`, `android-dependencies.pb` and',
        `\`native-graphs-${version}.tar.gz\` (parsed, with the gate report).`,
        '',
        `Commit \`${sha}\` · [EAS run](${runUrl(project, run.id)})`
    ].join('\n');
}
