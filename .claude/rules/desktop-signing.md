---
paths:
  - 'apps/desktop/signing/**'
  - 'apps/desktop/forge.config.ts'
  - '.github/workflows/desktop-preview.yml'
---

# Signing the desktop app

Signing is what the secret store rests on, not a release formality: its items are reachable only
through the access group a provisioning profile grants, and an unsigned build reports the keychain
unavailable and falls back to the development stub. The entitlements and what they buy are in
`desktop-secret-store.md`; this file is where the profiles and certificates come from.

Both profiles live in `apps/desktop/signing/`, neither is committed, and both name team `3ZVCUSJU6R`
and the explicit App ID `com.safely.wallet-desktop`.

| File | Certificate | Devices | Lives |
| ---- | ----------- | ------- | ----- |
| `dev.provisionprofile` | Mac Development (`Mac Developer: …`) | every registered machine | 365 days |
| `distribution.provisionprofile` | Developer ID Application | none — `ProvisionsAllDevices` | 6570 days (18 years) |

The development profile needs every machine that will run the build registered first — on that
machine `system_profiler SPHardwareDataType | grep "Provisioning UDID"` — then portal → Profiles →
macOS App Development. The distribution one comes from Profiles → Distribution → Developer ID and
needs a Developer ID Application certificate, which **only the Account Holder** can issue: five per
team, and its private key exists in one login keychain, so export the identity as `.p12` into the
team's secret manager or losing the machine burns a slot.

## Building and verifying

```
SAFELY_SIGN_IDENTITY="Developer ID Application: … (3ZVCUSJU6R)" \
SAFELY_SIGN_PROFILE=signing/distribution.provisionprofile \
  pnpm --filter @safely/desktop run package

signing/verify-signature.sh out/Safely-darwin-arm64/Safely.app
```

`SAFELY_SIGN_KEYCHAIN` is passed on to `codesign` and exists for CI's throwaway keychain; unset means
the default search list, which is what a local build wants. What `verify-signature.sh` checks — and
what no script can check — is in `desktop-secret-store.md`.

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

Notarisation is not wired yet: a Developer ID build is signed and runs, but `spctl` reports
`Unnotarized Developer ID`, so a downloaded copy is refused. Closing that needs an App Store Connect
API key and nothing else.

## QA builds come from CI

`.github/workflows/desktop-preview.yml` runs on a push to `release/**` — a merge into a release
branch is one — and by hand: Actions → Desktop QA build → Run workflow. It packages on `macos-15`
(arm64, the architecture the addon is built for), signs with the **Mac Development** identity, runs
`verify-signature.sh` as a gate and uploads the zip as `safely-desktop-qa-b<build>-<sha>` for 14
days.

The build number is the repository variable `DESKTOP_BUILD_NUMBER_MACOS`, which is where GitHub
keeps it rather than a commit, a tag or a cache: the run reads it, names the artifact after `n + 1`,
and the separate `record-build-number` job writes the value back — only once the signature gate has
passed, so a failed run consumes no number and every number belongs to an installable build. The
workflow's `concurrency` group is what stops two runs reading the same value. The same number is
handed to `make` as `SAFELY_BUILD_NUMBER`, so the app's About panel reads `Version <version>
(<build>)` and QA can name the build it is looking at — both halves of that are in
`desktop-app.md`. Editing the variable by hand is how the counter is reset or moved on; an absent
one starts at 1.

CI signs with a **certificate of its own**: a Mac Development one issued for the pipeline, not the
`Apple Development` identity a developer signs local builds with. Both grant the same entitlement, so
nothing about the build changes; what it buys is that revoking one leaves the other alone. Two things
follow. Apple names every development certificate after the account, so the CN reads
`Mac Developer: <person> (<id>)` and the **type**, not the name, is what tells the pipeline's
certificate apart from a personal one — the workflow logs it as `Signing as: …`. And
`dev.provisionprofile` embeds the certificate it was generated for, so reissuing the certificate
means regenerating the profile too and re-setting **both** secrets, never just the `.p12`.

The Developer ID key deliberately stays off CI. A leaked development certificate is revoked in one
click, burns none of the team's five Developer ID slots, cannot be notarised, and grants the
entitlement only on the machines the profile lists. A leaked Developer ID key is trusted by every Mac
in the world until it is revoked. A development profile is not a release path for the same reasons it
is the one CI gets: releases are a local `distribution.provisionprofile` build plus notarisation.

Three secrets, and they belong to the **`qa-desktop` environment**, not to the repository. Give the
environment a deployment-branch rule (and reviewers, if you want a second pair of eyes): a run on any
other ref then cannot read the certificate at all. The rule has to name every ref a build may come
from — `release/*` for the automatic trigger, plus whatever branch gets dispatched by hand — or the
run starts, reaches no certificate and dies in `Import signing identity`.

| Secret | Contents |
| ------ | -------- |
| `APPLE_DEV_CERT_P12` | base64 of a `.p12` holding the Mac Development identity **and** the Apple WWDR intermediate |
| `APPLE_DEV_CERT_PASSWORD` | the password the `.p12` was exported with |
| `APPLE_DEV_PROVISIONING_PROFILE` | base64 of a `dev.provisionprofile` listing every QA machine |

Exporting the identity alone leaves `codesign` on the runner unable to build the chain: in Keychain
Access select **both** `Mac Developer: …` and the `Apple Worldwide Developer Relations
Certification Authority` it chains to, then File → Export Items → `.p12`.

A fourth secret, `BUILD_NUMBER_TOKEN`, is a **repository** secret instead: a fine-grained PAT with
*Variables: read and write* on this repository and nothing else, because `GITHUB_TOKEN` cannot write
a variable. Keeping it out of the environment is the point — the job that advances the counter then
has no path to the signing certificate, and the job that holds the certificate has no token that can
write to the repository.

```
base64 -i MacDevelopment.p12 | pbcopy              # → APPLE_DEV_CERT_P12
base64 -i signing/dev.provisionprofile | pbcopy    # → APPLE_DEV_PROVISIONING_PROFILE

gh api -X PUT repos/andreevco/Safely/environments/qa-desktop
gh secret set APPLE_DEV_CERT_P12 --env qa-desktop

gh secret set BUILD_NUMBER_TOKEN                  # repository, not the environment
gh secret set SLACK_WEBHOOK_URL                   # repository, not the environment
gh variable set DESKTOP_BUILD_NUMBER_MACOS --body 0     # optional: an absent counter starts at 1
```

Adding a QA machine: its Provisioning UDID → portal → Devices, regenerate the macOS App Development
profile, re-set `APPLE_DEV_PROVISIONING_PROFILE`. Nothing in the repository changes. Registrations
count against 100 macOS slots per membership year and can only be cleared at renewal, so do not
register machines speculatively.

Installing the artifact:

```
unzip -q Safely-darwin-arm64-*.zip -d /Applications
xattr -dr com.apple.quarantine /Applications/Safely.app
```

Removing the quarantine flag is not optional: a development signature cannot be notarised, so
Gatekeeper refuses a downloaded copy. The Mac has to be listed in the profile — otherwise the
entitlement is not honoured, the store fails closed and the app exits instead of starting on a stub.

## The Slack report

The `report` job runs `if: always()`, so a crashed build is reported as loudly as a green one. It is
a third job on `ubuntu-latest` for the same reason `record-build-number` is a second: the webhook is
a **repository** secret, `SLACK_WEBHOOK_URL`, and nothing that is not the certificate belongs in the
job that holds it.

`SLACK_WEBHOOK_URL` is a Slack Workflow Builder trigger (`https://hooks.slack.com/triggers/…`), the
same kind the mobile pipeline posts to. It consumes a **flat** JSON whose keys are the variables that
Slack workflow declares, so adding a field here means adding it there first or the trigger rejects
the call:

| Key | Value |
| --- | ----- |
| `header` | `<branch> <- <commit subject>` — the mobile report's headline, same shape |
| `status_string` | `✅ Successful build <version> (<build number>)`, or `❌ Desktop build failed` |
| `artifact_url` | the artifact's download page, or the run's page when there is no artifact |

The version is `apps/desktop/package.json`'s `version`, read in the report job rather than passed
from the build — a job that failed before checkout still reports the right one. The download URL is
`actions/upload-artifact`'s `artifact-url` output, which needs a GitHub login to follow and only
exists once the upload step ran; every other outcome falls back to the run page.

An unset or malformed webhook logs a warning and the job still passes, and so does a webhook that
answers anything but 200: a signed, uploaded build must not go red because Slack hiccuped.
