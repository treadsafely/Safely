// Posts the build & e2e report to Slack.
//
// Run by the `report` job in apps/mobile/.eas/workflows/build-and-distribute.yml.
// All inputs arrive via env vars (EAS interpolates job statuses, build outputs
// and workflow inputs).
//
// Requires Node 18+ (global fetch). No external deps on purpose.
//
// The Slack webhook is a Slack Workflow Builder trigger
// (https://hooks.slack.com/triggers/...), which consumes a FLAT JSON whose keys
// must match the variables defined in that Slack workflow. This script sends:
//   text              — message body (overall status + iOS/Android version+build,
//                       plus the native dependency gate whenever it is not clean)
//   eas_workflow_url  — link to this EAS workflow run
//   github_pr_url     — link to the commit this build was made from (empty if unknown)
//   e2e_log           — Maestro result; on failure a link to the full log artifact
//   build_type_name   — "Production" (master, ships to Play) vs "Staging"
//   build_type_emoji  — emoji matching build_type_name
// Configure those variables in your Slack workflow trigger.

let {
    SLACK_WEBHOOK_URL,
    WORKFLOW_URL,
    COMMIT_SHA,
    REPOSITORY,
    RELEASE_NOTES,
    BUILD_TYPE,
    TARGET_BRANCH,
    IOS_VERSION,
    IOS_BUILD,
    ANDROID_VERSION,
    ANDROID_BUILD,
    STATUS_IOS,
    STATUS_IOS_CRUTCH,
    STATUS_ANDROID,
    STATUS_E2E,
    STATUS_SECURITY,
    SECURITY_SUMMARY
} = process.env;

// EAS job statuses: success | failure | error | skipped | canceled | (empty when not run)
const iosOk = STATUS_IOS === 'success' || STATUS_IOS_CRUTCH === 'success';
const androidOk = STATUS_ANDROID === 'success';
const e2eOk = STATUS_E2E === 'success';

// The native dependency gate blocks on master and only warns elsewhere, so its
// own status does not say whether there were findings — the summary does. A clean
// run says nothing in the report; anything else has to be visible.
const securityOk = STATUS_SECURITY === 'success';
const securitySummary = (SECURITY_SUMMARY || '').trim();
const securityClean = securityOk && securitySummary.startsWith('✅');

const ver = (v, b) => `v${v || '?'} (${b || '?'})`;

const buildsOk = iosOk && androidOk;
// "tests" in the headline = e2e.
const testsOk = e2eOk;
const headline = buildsOk
    ? testsOk
        ? '✅ successful build and tests'
        : '❌ successful build; tests failed'
    : testsOk
      ? '❌ failed build; successful tests'
      : '❌ failed build and tests';

const notes = (RELEASE_NOTES || '').trim();
const targetBranch = (TARGET_BRANCH || '').trim();
const notesWithBranch = targetBranch ? `${targetBranch} <- ${notes}` : notes;

const commitUrl =
    COMMIT_SHA && REPOSITORY ? `https://github.com/${REPOSITORY}/commit/${COMMIT_SHA}` : '';
const workflowUrl = WORKFLOW_URL || '';

const buildType =
    (BUILD_TYPE || '').trim() === 'production'
        ? { name: 'Production', emoji: '🚀' }
        : { name: 'Staging', emoji: '🏗️' };

function buildText() {
    const lines = [
        headline,
        iosOk ? `📱 iOS · ${ver(IOS_VERSION, IOS_BUILD)}` : '📱 iOS build failed ❌',
        androidOk
            ? `🤖 Android · ${ver(ANDROID_VERSION, ANDROID_BUILD)}`
            : '🤖 Android build failed ❌'
    ];

    // The Slack trigger takes a fixed set of variables, so this rides in `text`
    // rather than a field of its own.
    if (!securityClean) {
        const detail = securitySummary ? ` · ${securitySummary}` : '';
        lines.push(
            securityOk
                ? `🔒 Native dependencies${detail || ' · no summary'}`
                : `🚨 Native dependency gate ${STATUS_SECURITY || 'did not run'}${detail || ' ❌'}`
        );
    }

    if (!e2eOk) {
        lines.push('🧪 E2E failed ❌');
        lines.push('Full log is in the "Maestro Test Results" artifact on the EAS run page.');
    }

    return lines.join('\n');
}

async function postSlack() {
    // Must be a real URL — guards against an unresolved `${{ env.* }}` literal slipping through.
    if (!/^https:\/\//.test(SLACK_WEBHOOK_URL || '')) {
        console.log(
            `[report] SLACK_WEBHOOK_URL missing or not a URL — skipping Slack (got ${SLACK_WEBHOOK_URL ? 'a non-URL value' : 'empty'}).`
        );
        return;
    }

    const payload = {
        text: buildText(),
        eas_workflow_url: workflowUrl,
        github_commit_url: commitUrl,
        notes: notesWithBranch.slice(0, 1000),
        build_type_name: buildType.name,
        build_type_emoji: buildType.emoji
    };

    const res = await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        console.error(`[report] Slack failed: ${res.status} ${await res.text()}`);
    } else {
        console.log('[report] Slack message posted.');
        console.log(JSON.stringify(payload, null, 2));
    }
}

// Don't let a reporting hiccup fail the workflow.
await Promise.allSettled([postSlack()]);
