---
paths:
  - 'apps/desktop/signing/**'
  - 'apps/desktop/forge.config.ts'
  - '.github/workflows/desktop-*.yml'
  - '.github/actions/desktop-slack-report/**'
---

# Signing the desktop app

Signing is what the secret store rests on, not a release formality: its items are reachable only
through the access group a provisioning profile grants, and an unsigned build reports the keychain
unavailable and falls back to the development stub. The entitlements and what they buy are in
`desktop-secret-store.md`; this file is where the profiles and certificates come from.

**The app ships through the Mac App Store and nowhere else.** No Developer ID build was ever
distributed, so there is nothing to stay compatible with: `package:mas` and `make:mas` package
Electron's MAS variant (no private APIs, no Squirrel) and sign it sandboxed, and `forge.config.ts`
refuses any other target. `pnpm start` still runs the ordinary darwin Electron, unsigned and
unsandboxed, on the keychain stub — the sandbox is exercised only by a signed `package:mas`.

**Store builds are signed in CI and nowhere else.** The distribution keys exist only as secrets of
the `desktop-release` environment: no developer machine holds them, so `make:mas` does not run
locally and a store build cannot come from anywhere but `.github/workflows/desktop-build.yml`.
Testers install what that pipeline uploads, through TestFlight; there is no separate tester build.

**The desktop app is its own App Store Connect record, not a macOS platform added to the iOS one**
(`com.safely.wallet`). A shared bundle id would have given one product page and universal purchase,
but releasing it replaces the iOS app wherever that app runs on an Apple silicon Mac, and what
happens to that install's data is undocumented — Apple DTS says as much — while the Electron app
could not read the mobile app's files anyway. Separate records leave those installs alone. The
cost: the record needs a name other than "Safely", which the iOS record holds, and the two can never
be merged later — moving to a shared bundle id would mean a new app whose users lose their keychain
items.

Both profiles name team `3ZVCUSJU6R` and the explicit App ID `com.safely.wallet-desktop`.

| Profile | Signs with | Devices | Lives |
| ------- | ---------- | ------- | ----- |
| `dev.provisionprofile` | Mac / Apple Development | every registered machine | `apps/desktop/signing/`, uncommitted — a developer's own sandboxed build |
| Mac App Store Connect | Mac App Distribution | none | the `APPLE_MAS_PROVISIONING_PROFILE` secret only |

The development profile (portal → Profiles → macOS App Development) needs every machine that will
run the build registered first — on that machine `system_profiler SPHardwareDataType | grep
"Provisioning UDID"`. A development profile lives 365 days, which is why a local build stops
working within the year. Registrations count against 100 macOS slots per membership year and can
only be cleared at renewal, so do not register machines speculatively. The App Store profile comes
from Profiles → Distribution → Mac App Store Connect.

A store upload needs two distribution certificates, issued by the Account Holder or an Admin:
**Mac App Distribution** (on the runner `3rd Party Mac Developer Application: …`) signs the `.app`,
**Mac Installer Distribution** (`3rd Party Mac Developer Installer: …`) signs the `.pkg` around it
— App Store Connect takes nothing but a signed installer package. Mac App Distribution rather than
the cross-platform Apple Distribution, which the store treats the same: a leaked key then signs for
the Mac only, not for the iOS app as well.

## Building and verifying locally

A sandboxed build to run on a registered Mac, signed with the developer's own identity:

```
SAFELY_SIGN_IDENTITY="Mac Developer: … (…)" \
SAFELY_SIGN_PROFILE=signing/dev.provisionprofile \
  pnpm --filter @safely/desktop run package:mas

signing/verify-signature.sh out/Safely-mas-arm64/Safely.app
out/Safely-mas-arm64/Safely.app/Contents/MacOS/Safely
```

Launching the binary directly keeps main's log in the terminal. **The identity has to be the
certificate the profile lists** — `security cms -D -i signing/dev.provisionprofile` shows it under
`DeveloperCertificates`. Any other one of the same team, Developer ID included, signs without
complaint and the app is then killed by AMFI before it runs a line: a bare `killed` and nothing else.
`verify-signature.sh` checks for exactly that.

An App Store–signed app does not launch outside the store; only the development build is run by
hand. There is no notarisation: App Review takes its place. `ITSAppUsesNonExemptEncryption: false`
in `extendInfo` answers the export compliance question once, as `apps/mobile/app.config.js` does —
without it every upload sits in App Store Connect until someone answers it by hand.

`SAFELY_SIGN_KEYCHAIN` is passed on to `codesign` and the installer signing and exists for CI's
throwaway keychain; unset means the default search list, which is what a local build wants. What
`verify-signature.sh` checks — and what no script can check — is in `desktop-secret-store.md`.

## Sandbox entitlements

Two plists, and which file gets which is decided by path in `forge.config.ts`: the top-level bundle
gets `entitlements.plist`, **everything nested** — helpers, frameworks, the keychain addon — gets
`entitlements.helper.plist`. That is the shape `@electron/osx-sign` uses for MAS by default.

- **A helper carries exactly `app-sandbox` and `inherit`.** An inheriting helper with any other key
  is killed at launch, so `allow-jit` and the camera, which used to sit on the helper plist, come
  from the main binary's sandbox now. The keychain entitlements stay off the helpers for the same
  reason as before: the renderer runs there.
- **`com.apple.security.application-groups` must name `<ElectronTeamID>.<bundle id>`.** A MAS
  Chromium names its shared memory and Mach ports under that group; a mismatch leaves the helpers
  unable to start, with nothing in our logs. `ElectronTeamID` is set in `extendInfo`, the group in
  `entitlements.plist`, and `verify-signature.sh` checks that the two agree.
- `network.client` is the only network entitlement: the app never listens.
- `device.usb` is for the Ledger over WebHID (`desktop-ledger.md`); `device.camera` for the QR
  scanner. Both sit on the main plist and reach the helpers through inheritance.
- osx-sign's `preAutoEntitlements` would insert the identifier, team and group keys; the plists
  already carry all three, so it changes nothing and the signed entitlements are exactly the files.

- **The hardened runtime is on the main binary only.** Under it V8 needs `allow-jit` to map its JIT
  region, an inheriting helper cannot carry that key, and the renderer then dies at start with `V8
  process OOM (Failed to reserve virtual memory for CodeRange)` — measured on the first sandboxed
  build. Nested code is therefore signed without the runtime (`hardenedRuntime: !nested` in
  `forge.config.ts`), which the Mac App Store does not require; the helpers still run sandboxed and
  without `get-task-allow`. `verify-signature.sh` fails a helper that has the runtime on.

  This is a decision between three options, and the other two were rejected:
  - **no runtime anywhere** — electron-builder's MAS default (`app-builder-lib` hardens a MAS build
    only when told to). It would leave the main binary, the one process that reaches the keychain
    group, without library validation and honouring `DYLD_INSERT_LIBRARIES`: code of the same user
    could start Safely with its own library loaded under our signature. Whether the App Sandbox
    stops that load is not verified, and the main binary loses nothing by keeping the runtime;
  - **the runtime everywhere, `allow-jit` on the helpers** — a helper carrying it cannot inherit, so
    each would need a sandbox and container of its own, and Chromium's GPU and network helpers
    write into the main binary's `userData`. Electron does not support that layout.

  What the choice costs is in `desktop-secret-store.md`, "What it deliberately does not protect".
  Two assumptions behind it are not yet measured: that dyld strips `DYLD_*` from the main
  binary's environment so the helpers it spawns do not inherit them, and that an inheriting helper
  cannot be started on its own.

Verified on a development-signed sandboxed build on macOS 26 (Apple Silicon), by launching it:
the window and the renderer, keychain writes through the dev tools, Touch ID, sync, and the QR
camera with the capture in the GPU helper relying on the inherited sandbox alone.

**A signing failure is silent unless it is forced not to be.** electron-forge runs
`@electron/packager` with `quiet: true`, and packager wraps `@electron/osx-sign` in a `try` whose
default is `continueOnError: true` — so a failing `codesign` becomes a warning that is never printed,
`make` exits 0, and out comes an app carrying only Electron's own ad-hoc signature, which the bundle
rename has already stripped of its resource seal. The symptom is `verify-signature.sh` reporting
`code has no resources but signature indicates they must be present` on a build whose packaging step
looked perfectly healthy. `continueOnError: false` in `forge.config.ts` is what turns that back into
a build failure carrying the real `codesign` message; never remove it. `DEBUG=electron-osx-sign` adds
every `codesign` invocation to the output when the message alone is not enough — it also dumps the
provisioning profile, device UDIDs included, so use it for one run rather than leaving it on.

A throwaway keychain has to be **added to the user search list** (`security list-keychains -d user
-s`), not only handed to `codesign` as `--keychain`: identity lookup goes through the search list, and
without it signing fails with `errSecInternalComponent`. It must also carry no lock timeout, or a long
packaging step can meet a relocked keychain halfway through.

## The TestFlight pipeline

Three workflows. `desktop-build.yml` is the pipeline and runs only when called (`workflow_call`);
`desktop-staging.yml` calls it on a push to `release/*` — a merge into a release branch is one — and
`desktop-release.yml` on a push to `master`. Both callers also run by hand: Actions → Desktop staging
/ Desktop release → Run workflow. The jobs are split by what each may hold:

| Workflow | Job | Runner | Holds | Does |
| -------- | --- | ------ | ----- | ---- |
| release | `prepare` | `ubuntu-latest` | `github.token` | reads the desktop version; ends the run unless the push is the merge of a `release/*` pull request and `v<version>-desktop` is not published yet |
| build | `allocate-build-number` | `ubuntu-latest` | `BUILD_NUMBER_TOKEN` | reads the counter through the API and hands `n + 1` to `build` |
| build | `build` | `macos-15` | the certificates and the profile | `make:mas`, `verify-signature.sh`, `pkgutil --check-signature`, lists the resolved production dependencies, hands the `.pkg` and that `desktop-dependencies.txt` on as an artifact kept 3 days |
| build | `upload` | `macos-15` | the App Store Connect API key | `xcrun altool --validate-app`, then `--upload-app` |
| build | `record-build-number` | `ubuntu-latest` | `BUILD_NUMBER_TOKEN` | advances the counter, only after `upload` succeeded |
| build | `report` | `ubuntu-latest` | `SLACK_WEBHOOK_URL` | posts the outcome — every outcome when called from staging, failures only when called from release |
| release | `release` | `ubuntu-latest` | `github.token` | after the pipeline, publishes the GitHub prerelease `v<desktop version>-desktop` on this commit with the `.pkg` and the dependency listing |
| release | `report` | `ubuntu-latest` | `SLACK_WEBHOOK_URL` | posts the release, a failed `release`, a failed `prepare`, or a version bump that came with no release pull request; a failed or cancelled pipeline is reported by the pipeline itself, naming the unpublished tag |

The Slack post itself is the composite action `.github/actions/desktop-slack-report`, shared by both
`report` jobs. A caller passes `BUILD_NUMBER_TOKEN` and `SLACK_WEBHOOK_URL` explicitly rather than
`secrets: inherit`; the environment secrets reach `build` and `upload` through their own
`environment:`, which is matched against the caller's ref.

**A release branch is TestFlight only; the release is the merge into master**, the same shape as
mobile's `release-draft.yml` + `release-assets.yml`. Publishing the release creates the tag
`v<desktop version>-desktop` on the merge commit, with the package built from that very commit — not
the release branch's, whose tree can differ once master has moved — so the last TestFlight build the
testers see is the one the tag names. Master is built **only for the merge of a `release/*` pull
request, and once per desktop version**: `prepare` looks up the pull request that brought the commit
(`commits/<sha>/pulls`, head in this repository — a fork can name a branch `release/x` too) and then
asks GitHub whether the release exists. GitHub links a merge commit to its pull request with a
delay, so when the push changed the desktop version (compared with `github.event.before`) and the
lookup comes back empty, `prepare` asks again for up to 50 seconds. A dependabot or feature merge
builds nothing, spends no macOS minutes and no build number; one that leaves the desktop version
alone posts nothing to Slack, while one that bumps it — or a release merge the lookup still cannot
see — posts a warning naming the way out, a hand-dispatched release. Bumping the desktop version on a release branch is therefore what schedules a desktop
release; a release branch that does not bump it ships mobile only. A hand-dispatched release on
`master` skips the pull request check and releases whatever commit master is at; dispatched from any
other branch it fails.

**Why `push` and not `pull_request: closed`, which is what mobile's `release-draft.yml` uses.** The
environment's branch rule is matched against the run's `GITHUB_REF`, and a `pull_request` run's is
`refs/pull/<n>/merge`. Allowing that ref in `desktop-release` would hand the signing keys to every
`pull_request` run — any branch with a pull request open, a changed workflow included, reviewed or
not. Mobile can use that event because its release workflows hold no signing secret: EAS signs.
`pull_request_target: closed` would pass the branch rule — its ref is the base branch and its
workflow file comes from there — but it hands secrets to an event any pull request raises, forks
included, and stays safe only while nothing in the pipeline checks out the pull request's head; the
`push` trigger plus the lookup gives the same answer without that edge.

There is no check of the version against the branch name as mobile has: the branch is named after
the mobile version, the two platforms version independently, and that is also why the tag carries
the `-desktop` suffix — one `release/*` branch can carry mobile `2.2.1` and desktop `1.1.5` at once.
The release stays a prerelease until the Mac App Store rollout, which is done by hand in App Store
Connect. Mobile attaches through the polling `release-assets.yml`; desktop builds in CI, so it
attaches its own assets directly. The listing mirrors mobile's `android-sdkDependencies.txt`.

`macos-15` is arm64, the architecture the addon is built for. The upload calls `altool` directly
rather than through a marketplace action: `apple-actions/upload-testflight-build` is a community
wrapper — not Apple's — around the same `altool` for a `.pkg`, and third-party code next to the API
key buys nothing. The `build` job also checks the identities by kind: it takes exactly one `3rd Party
Mac Developer Application` and one `3rd Party Mac Developer Installer` from the imported keychain, so a
development or Developer ID certificate pasted into the secret fails there, not after the upload.

**What a leak costs, and why the keys may live here.** A build signed with Mac App Distribution runs
only once the App Store or TestFlight installed it, so the certificates alone buy an attacker
nothing outside Apple's pipeline. The API key is **Developer** role: it uploads builds and cannot
submit one for review or release it — an upload reaches internal testers at most.

All of it is one environment, **`desktop-release`**, and the split between the halves is the jobs':
a job receives only the secrets it references, so `build` sees the certificates and `upload` the
key, each on its own runner.

- certificates: `APPLE_MAS_APP_CERT_P12`, `APPLE_MAS_INSTALLER_CERT_P12` (base64 `.p12`s, each the
  identity **and** the Apple WWDR intermediate it chains to, or `codesign` on the runner cannot
  build the chain), `APPLE_MAS_CERT_PASSWORD`, `APPLE_MAS_PROVISIONING_PROFILE` (base64);
- upload: `ASC_API_KEY_P8`, `ASC_API_KEY_ID`, `ASC_API_ISSUER_ID`.

**A push to `release/*`, or a release merge into `master`, builds and uploads with no approval.**
What decides what gets signed is therefore what can reach those branches, and that is two
repository rulesets, not the environment. "master & release" (`master`, `release/*`) requires a pull request with one approving
review and forbids deletion and force pushes, admins bypassing. "Release" (`release/*`)
**restricts creations**, bypassed only by the people who cut release branches — without it anyone
with write access creates `release/x` from any commit, a changed workflow included, and CI signs it.
That rule covers the mobile `release/<version>` branches as well, so whoever cuts those needs to be
on its bypass list. The workflow's trigger is `release/*` and not `release/**` for the
same reason: `*` stops at `/`, and a nested branch would build without the ruleset. The environment itself
carries deployment-branch rules for `release/*` and `master` and no reviewer. Approval per run was the
alternative and was dropped: with the ruleset in place it would ask the same question twice. A
branch dispatched by hand has to be added to the environment's branch rule too, or the run starts
and dies reaching for a secret it cannot read.

**Both distribution certificates live one year, and so does the profile issued on them.** Expiry
touches only uploads: Apple's certificate help says existing Mac App Store apps are unaffected while
the membership is valid, so no installed copy stops and no user has to update. The pipeline is what
stops — `security find-identity -v` lists no expired identity, so `build` fails at the identity check
with `found 0`. Renewal is a new CSR, both certificates, a new Mac App Store Connect profile (it is
bound to the certificate), and the four `APPLE_MAS_*` secrets replaced; the keychain group follows
the team and the bundle id, so users' items survive it. A revoked certificate differs in one way:
builds signed with it that are uploaded but not yet submitted may turn Invalid Binary.

The keys go into the secrets and **nowhere else**. Creating the certificates in Keychain Access is
fine, but once the `.p12`s are in the environment the identities are deleted from the login keychain
together with their private keys, and the exported files with them. There is no backup on purpose:
a lost secret means revoking the certificates, issuing new ones and a new profile, and no user
notices — the App Store re-signs what it distributes, and the keychain group follows the team and
the bundle id, not the certificate.

```
gh api -X PUT repos/treadsafely/Safely/environments/desktop-release
# Deployment branches: exactly the refs the workflow builds (or Settings → Environments → desktop-release).
gh api -X POST repos/treadsafely/Safely/environments/desktop-release/deployment-branch-policies -f name='release/*' -f type=branch
gh api -X POST repos/treadsafely/Safely/environments/desktop-release/deployment-branch-policies -f name=master -f type=branch
base64 -i app.p12       | gh secret set APPLE_MAS_APP_CERT_P12       --env desktop-release
base64 -i installer.p12 | gh secret set APPLE_MAS_INSTALLER_CERT_P12 --env desktop-release
gh secret set APPLE_MAS_CERT_PASSWORD --env desktop-release
base64 -i appstore.provisionprofile | gh secret set APPLE_MAS_PROVISIONING_PROFILE --env desktop-release
gh secret set ASC_API_KEY_P8 --env desktop-release < AuthKey_<id>.p8
gh secret set ASC_API_KEY_ID --env desktop-release
gh secret set ASC_API_ISSUER_ID --env desktop-release

gh secret set BUILD_NUMBER_TOKEN                  # repository, not an environment
gh secret set SLACK_WEBHOOK_URL                   # repository, not an environment
gh variable set DESKTOP_ASC_APP_ID --body <id>    # optional: links the Slack report to TestFlight
```

The build number is the repository variable `DESKTOP_BUILD_NUMBER_MACOS`, which is where GitHub
keeps it rather than a commit, a tag or a cache: `allocate-build-number` reads it and derives
`n + 1` and the artifact name from it, `build` signs that number into the bundle, and
`record-build-number` writes the value back — only once `upload` succeeded, because App Store
Connect refuses a `CFBundleVersion` it has seen, so a number is spent exactly when Apple saw it.

**The `desktop-build` concurrency group serialises the pipelines of both callers**, and it sits on
the caller's `uses:` job, not on either workflow: a master merge that `prepare` turns away never
enters the group, so it never waits in it. The group carries `queue: max`: by default GitHub keeps one
pending job per group and a newer one replaces it, which let a release-branch push cancel a release
waiting behind another build. With the queue every pipeline waits its turn, up to 100, roughly in
arrival order — so every release-branch push is built and reaches TestFlight, a burst included. A
release whose pipeline was cancelled anyway (by hand, or past the cap) is rebuilt from the same merge
commit by "Re-run all jobs" on that run. GitHub's docs show
`queue` on a workflow-level group only; on a `uses:` job it is unverified until the first run, and an
unsupported key fails validation loudly rather than falling back.

**The counter is read through the API, never as `${{ vars.DESKTOP_BUILD_NUMBER_MACOS }}`.** The
`vars` context is fixed when a run is created, not when its job starts, so a run that waited in the
group behind another one read the number from before the other recorded its own — both built the
same `CFBundleVersion` and the second failed validation as a duplicate (run 39602358456). Reading
it needs the token, which is why it is a job of its own and not a step of `build`. Any failure to
read it fails the run, a 404 included: a PAT that lost access to the repository answers 404 too,
and treating that as "unset" would restart the counter at 1 and cost a full build before Apple
refuses it.

**Retry a failed run with "Re-run all jobs", not "Re-run failed jobs"** — in either caller: on a
release run, too, "Re-run failed jobs" re-runs the failed jobs inside the called pipeline and keeps
the successful `allocate-build-number` and its number, which a newer run may have uploaded and
recorded in the meantime; the Slack report for a failed build or upload says so. Two exceptions,
both after a good upload. When `record-build-number` failed, set the variable as the report says
and then "Re-run failed jobs": that re-runs the counter write and, on a release run, publishes the
release with the build already uploaded. The other is
`desktop-release.yml`'s `release` failing after a good upload: "Re-run failed jobs" there re-runs
only it and the report, since the called pipeline succeeded — the number is spent and recorded, the
package sits in the run's artifact for 3 days, and a full re-run would upload a second build for
nothing.

Two outcomes leave the counter behind a number Apple already holds, and the next run then fails
validation as a duplicate build: `upload` failing after App Store Connect took the package (an
`altool` timeout), and `record-build-number` failing after a good upload. The Slack report names
both and the value to set the variable to; the counter is not read back from App Store Connect
because that would put the API key into `build`, next to the certificates. The same number is
handed to the build as `SAFELY_BUILD_NUMBER`, so the app's About panel reads `Version <version>
(<build>)` and a tester can name the build they are looking at — both halves of that are in
`desktop-app.md`. Editing the variable by hand is how the counter is reset or moved on; an absent
one fails the run, so a fresh repository creates it with `0` first. `BUILD_NUMBER_TOKEN` is a
fine-grained PAT with *Variables: read and write* on this repository and nothing else, because
`GITHUB_TOKEN` cannot write a variable; it is a repository secret so that neither of the jobs
holding keys has a token that can write to the repository.

Testers are the internal group of the App Store Connect record, with automatic distribution on: a
build reaches them once Apple has processed it, through the TestFlight app on their Mac. The sandbox
keeps `userData` in `~/Library/Containers/com.safely.wallet-desktop/`.

## The Slack report

`desktop-build.yml`'s `report` runs `if: always()` after `build`, `upload` and
`record-build-number`, so a crashed build is reported as loudly as a green one and a counter left
behind is reported before the next run trips on it. Called from `desktop-release.yml` it stays quiet
on full success (`report-success: false`), and that workflow's own `report` posts the release
instead — one message per run, and the release one links the GitHub release. Neither reads the
called workflow's outputs after a failure: only the pipeline itself knows which of its jobs failed.
Both are jobs on `ubuntu-latest` of their own for the same reason
`record-build-number` is: the webhook is a **repository** secret, `SLACK_WEBHOOK_URL`, and it has no
business next to the certificates or the API key.

`SLACK_WEBHOOK_URL` is a Slack Workflow Builder trigger (`https://hooks.slack.com/triggers/…`), the
same kind the mobile pipeline posts to. It consumes a **flat** JSON whose keys are the variables that
Slack workflow declares, so adding a field here means adding it there first or the trigger rejects
the call:

| Key | Value |
| --- | ----- |
| `header` | `<branch> <- <commit subject>` — the mobile report's headline, same shape |
| `status_string` | `✅ Released v<version>-desktop (<build number>) …`; `✅ Uploaded to TestFlight <version> (<build number>)`; `⚠️ Uploaded …, but DESKTOP_BUILD_NUMBER_MACOS was not advanced …`; `❌ Desktop upload failed — …`; `❌ Desktop build number could not be read …`; or `❌ Desktop build failed …` |
| `artifact_url` | the record's TestFlight page when `DESKTOP_ASC_APP_ID` is set and the upload succeeded, the run's page otherwise |

The version is `apps/desktop/package.json`'s `version`, read in the report job rather than passed
from the build — a job that failed before checkout still reports the right one. "Uploaded" means App
Store Connect took the package; processing it takes a few more minutes before testers see the build.

An unset or malformed webhook logs a warning and the job still passes, and so does a webhook that
answers anything but 200: an uploaded build must not go red because Slack hiccuped.
