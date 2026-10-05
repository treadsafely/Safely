---
paths:
  - 'scripts/**'
  - 'security/**'
  - 'apps/mobile/scripts/native-audit/**'
  - 'apps/mobile/scripts/release/**'
  - 'apps/mobile/eas.json'
  - 'apps/mobile/.eas/workflows/**'
  - '.github/workflows/ci.yml'
  - '.github/workflows/release-draft.yml'
  - '.github/workflows/release-assets.yml'
  - '.github/dependabot.yml'
  - 'pnpm-workspace.yaml'
---

# Dependency security

Two gates, one shape: collect the graph, match it against a database, fail on advisories nobody has
reviewed, keep the reviewed ones as owned, expiring exceptions in a JSON registry. Neither gate ever
opens a pull request — updating is Dependabot's job, deciding is ours.

| Gate           | Code                                | Database                          | Registry                                                  | Runs                                                                    |
| -------------- | ----------------------------------- | --------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| **JavaScript** | `scripts/audit-gate.mjs`            | `pnpm audit`                      | `security/dependency-advisories.json`                     | `pnpm dependencies-audit`, `dependency-advisories` in `ci.yml`          |
| **Native**     | `apps/mobile/scripts/native-audit/` | OSV (Maven), Sonatype (CocoaPods) | `apps/mobile/scripts/native-audit/native-advisories.json` | `security_gate` in `apps/mobile/.eas/workflows/build-and-distribute.yml` |

```bash
pnpm dependencies-audit                                       # JS, what CI runs
node apps/mobile/scripts/native-audit/index.mjs gate          # native, declared coordinates only
node apps/mobile/scripts/native-audit/index.mjs --help        # parse / gate, no credential
node apps/mobile/scripts/native-audit/fetch-graphs.mjs --help # download a capture, needs EXPO_TOKEN
```

The native gate has no `pnpm` script and no CI job on purpose: its declared mode blocks on findings
that never ship (below), and the mode that describes a release only exists inside an EAS build. So a
pull request is gated on JavaScript only.

Exit codes for both: `0` clean, `1` blocking findings, `2` malformed registry or an unreachable
database. A run that could not scan fails rather than passing quietly — the one invariant never to
trade away, and a *partial* answer counts as not having scanned: OSV's `querybatch` is positional, so
a short `results` array means the tail of the batch went unasked, a `next_page_token` means one
coordinate is under-reported, and a purl missing from a Sonatype `component-report` was never looked
at. All three throw. That is a different thing from a component Sonatype returns with no
`description` — "not in the database", which is reported on its own.

**None of the native work has run on master yet** (2026-09-08): the gate, the capture globs, the EAS
gate job and the release workflows are all still on this branch, so every number below was measured
on a branch build or a laptop, and the first master build after the merge is also the first test of
the `buildArtifactPaths` globs. Delete this paragraph once that build has run.

## Declared is not a subset of resolved

The resolved iOS and Android graphs exist nowhere else: `apps/mobile/.gitignore` ignores `ios/` and
`android/`, and no `Podfile.lock` is committed. Two modes, seeing different graphs on purpose:

- **declared** — Maven coordinates read out of `node_modules` and react-native's version catalog.
  Three seconds, no JDK, no prebuild. All a pull request could have; 125 coordinates today.
- **resolved** (`gate --graph/--pods`) — what a build actually resolved, and the only mode that
  describes what shipped. `--graph` is **repeatable**, one per Android artifact a run resolved: on
  master the APK's graph and the bundle's, merged into one subject per coordinate that names the
  artifacts it is in, so a finding is gated once and still says which artifact carries it.

**Measured: neither is a subset of the other** — 125 declared against 309 resolved. Declared mode's
two blocking findings (`okhttp 3.14.9`, `okio 2.9.0`) name versions that lose conflict resolution to
4.12.0 and 3.16.0 and never ship. Never treat a declared result as the truth about a release.

**Declared mode also reports what it could not put a version on** — 36 declarations today:
`androidx.camera:*` and the Glide/Fresco/Coil chains behind a Gradle property, `react-android` and
`react-native` with no version or a `+` range. No database was asked about any of them, which is not
the same as clean, so the report lists them separately instead of dropping them; a resolved graph has
none. What the collector reads is the *configuration name* and nothing more:
`implementation`/`api`/`compileOnly` and any variant prefix of them are `runtime`, `test*` is `test`,
`debug*` is `dev` (expo-dev-menu's `debugOnly`/`debugOnlyApi` closures are why 13 coordinates land
there — `expo.devmenu.configureInRelease` is set nowhere here), and `kapt`/`ksp`/`annotationProcessor`
are `build`. `rn-dev` stays a claim only a reviewed entry can make, because no configuration name
carries it.

## Capture — configuration only, no build hook

`buildArtifactPaths` in `apps/mobile/eas.json`. Adding an `eas-build-post-install` hook to collect
graphs would be a regression; everything needed is already written to disk.

- **iOS** — `pod install` writes `ios/Podfile.lock`.
- **Android, APK** — `:app:assembleRelease` makes AGP write
  `android/app/build/outputs/sdk-dependencies/release/sdkDependencies.txt`: plaintext protobuf, 309
  resolved coordinates, 262 sha256 digests (verified against `shasum -a 256` of the jar), the edge
  list, and the repository each came from — the only record of *which artifact* shipped rather than
  which version was asked for. `repo_index` is an `Int32Value`, so **index 0 is written as an empty
  block** and reading only its scalar loses the repository of 285 of the 309: the text reader treats
  the block's presence as the answer.
- **Android, AAB** — `:app:bundleRelease` writes no `sdkDependencies.txt`. It writes
  `dependencies.pb` instead, the same `AppDependencies` message in protobuf's binary encoding, which
  the AAB also carries under `BUNDLE-METADATA/`. The `production` profile therefore overrides the
  Android path with the `.pb` glob and `android/dependencies-pb-parser.mjs` reads it: measured on the
  shipped v1.2.3 bundle, 312 coordinates, 265 digests, module `base` with 77 direct dependencies, and
  digests identical to the text form's for the coordinates in both.

Two traps, both measured on real builds:

1. **`buildArtifactPaths` is all-or-nothing.** One path that does not exist aborts the entire upload
   and stores nothing (`Failed to upload build artifacts`), so a shared profile-level list holding
   both platforms' paths silently captures nothing on both. Keep the list **inside the `ios` and
   `android` blocks**, and verify with `eas config --platform <p> --profile <p>`.
2. **A single captured path is not archived.** It arrives as `artifacts-<build id>.<its own
   extension>` — the file itself, so `fetch-graphs.mjs` writes it straight to the name `parse`
   expects. Capturing two or more paths would produce an archive that nothing here unpacks.

## The gate job

`security_gate`, between the build jobs and distribution. A job rather than a hook because the
block-or-warn decision is per build type, its status reaches the Slack report, and blocking
distribution leaves the builds alive for inspection.

- **The bundle build is reached through `after:`, not `needs:`.** `build_android_play` runs on master
  only, and a job whose `needs` names a skipped job is skipped itself (`skipReason`
  `WorkflowJobSkipReasonUnsuccessfulDependencies`, measured on a probe), so `needs` would disable the
  gate on every other branch. `needs` and `after` on one job are allowed and work. The wait costs
  nothing — the bundle build finishes alongside the APK build the gate already waits for.
- **Both steps ask for the bundle by job status, never by the output value.** A missing output
  interpolates as the literal string `undefined`, not as empty, so `[ -n "<build id>" ]` is true on
  every staging run; the test is `after.build_android_play.status == 'success'`. A bundle build that
  succeeded and left no graph then fails the scan rather than gating the APK alone and calling the
  release clean.
- **Block on `production`, warn on `staging`, read from `needs.prepare.outputs.build_type`** — not
  `github.ref_name`, which `prepare` already interprets and which is **empty** on a run started with
  `eas workflow:run`. A second reading of the ref is a second definition of it.
- Everything that can go wrong — no capture, unreachable database, missing token — reaches the same
  verdict as a finding; an infrastructure failure never reads as a pass. The job scans, records the
  verdict, uploads the artifact and only then fails, so the report survives a block.
- `distribute_ios_crutch` sits on `after:`, which ignores upstream status, so it needs its explicit
  `after.security_gate.status == 'success'` or it routes around the gate.
- **eas-cli is not on the worker's PATH** and `build:view` would need `eas/install_node_modules` to
  resolve a project id from `app.config.js`, so `fetch-graphs.mjs` queries `api.expo.dev/graphql`
  with the `EXPO_TOKEN` already in the environment. Don't reintroduce the CLI.
- **The token lives in one step, which is why downloading is a separate entrypoint.** ES imports are
  eager, so an `index.mjs fetch` command would load every parser and both database clients into the
  process holding a credential; `fetch-graphs.mjs` imports five modules against `index.mjs`'s twenty,
  writes the capture and never reads inside it. `index.mjs` does not import the Expo client at all,
  and the `fetch` command is gone rather than deprecated — a second way in would make the separation
  advisory. The scan step opens with `unset EXPO_TOKEN`, because `environment` is per-job and EAS
  puts its variables into every process of the job: no secret can be scoped to one step
  declaratively, and the code parsing a third-party Gradle build's output must not hold the token.
- **Both steps run under Node's permission model** — `--allow-fs-read` for the script plus its
  inputs, `--allow-fs-write` for one output directory, nothing else. Relative paths work (cwd is
  `apps/mobile`), a trailing `/*` is recursive, `mkdirSync(recursive)` of the allowed directory is
  permitted, and it refuses writes into the checkout, reads of the lockfile or `~/.expo/state.json`,
  and any `child_process`. It does **not** cover the network — Node 24 has no `--allow-net` and EAS
  has no egress controls — which is what the token separation is for. The cost: every path passed as
  an option has to be inside the allowlist, so a local `--input snapshot.json` outside the graphs
  directory reads as `ERR_ACCESS_DENIED`.
- **`eas/upload_artifact` globs `path` from the checkout root, not from the step's working
  directory.** `eas/checkout` moves the default working directory into `apps/mobile` — that is why a
  `run:` step reaches `scripts/native-audit/index.mjs` — but the function passes the repo root as the
  glob root and ignores `working_directory:` entirely, so the graphs upload as
  `apps/mobile/native-graphs/**/*`. With `ignore_error: true` a mismatch is one warning line (`Did
  not find any paths matching`), which is how the artifact stored nothing while every run read green.

## Databases

**Maven — OSV**, no credentials. **CocoaPods — Sonatype**, `SONATYPE_TOKEN`. JavaScript stays on
`pnpm audit`, so it needs neither.

Snyk is unusable: its API is Enterprise-only. OSV, the GitHub Advisory Database and Trivy hold no
CocoaPods data at all, and NVD has a record for exactly one pod in this graph, keyed by a CPE
version no pod version can be compared to.

Sonatype specifics that cost measurement:

- **only `Authorization: Bearer` authenticates** — `token <t>` and Basic-with-token-as-username both
  return 401;
- severity arrives as a CVSS number, so the bands are applied in the matcher; a v2 vector has no
  `critical` band;
- an exception may be keyed by CVE **or** GHSA — Sonatype names records by CVE, OSV by GHSA, and the
  GHSA id is only in `externalReferences`, which the matcher lifts into aliases;
- **a component Sonatype never indexed comes back with no `description`, and its empty vulnerability
  list means nothing.** Those are reported separately (`MLImage@1.0.0-beta7` today). Never let that
  collapse into "clean";
- metered at ~0.093 credits per component against a free 500/month, so ~380 builds' worth of pods.
  That arithmetic is also why Maven stays on OSV — 309 coordinates would be ~29 credits a build.

## iOS is mostly unanswerable, and the reason is the identifier

Measured on a real `pod install`: **150 installed pods, 14 from the CocoaPods trunk, 136 `:path`
pods** versioned by the npm package that ships them, which no database can hold a record for. Of the
14, eleven exist because of one feature — barcode scanning pulls the whole MLKit tree.

**Only the build's own resolve describes what shipped, and iOS proves it.** The same commit resolved
on a laptop and on an EAS worker a day apart gave identical Android graphs — 309 coordinates, zero
difference, because Gradle pins everything — but three different pods: `GoogleDataTransport` 10.1.0 →
10.1.1, `GoogleUtilities` 8.1.0 → 8.1.3, `PromisesObjC` 2.4.0 → 2.4.1, all `~>` ranges in the MLKit
chain.

**A pod's version is not the upstream version.** `nanopb 3.30910.0` is nanopb `0.3.9.10`, so NVD's
`nanopb` CVEs, whose ranges end below `0.3.9.8`, cannot be compared without a hand-maintained
translation table — and Sonatype cannot do it either, which is why it answers about `libwebp` (pod
version equals upstream) but not `nanopb`.

React Native 0.85 also folds boost, glog, RCT-Folly, fmt, fast_float and DoubleConversion into one
prebuilt `ReactNativeDependencies` xcframework versioned by the RN version; Hermes and Skia ship
prebuilt too, and no version-keyed database sees inside any of them. A run without `--pods` lists
those eight vendored podspec versions as inventory — indicative only, never gated, and replaced by a
resolved `Podfile.lock` when there is one.

## Fixing what is not ours

Only 3 of 309 resolved Maven coordinates are declared in this repository.

- **JavaScript:** prefer an `overrides` entry in `pnpm-workspace.yaml` to an exception — it removes
  the advisory instead of accepting it. Override selectors are scoped by **range intersection, not by
  name**: a bare `ws@7` also rewrites isomorphic-ws's `*` peer range, which carries the Ledger
  transport on ws 8, which is why the `ws` entries are written per parent (`metro>ws`). An override
  changes the whole workspace graph, so it ships only after a mobile build and release testing.
- **Android:** the Gradle equivalent is `resolutionStrategy.force` in the generated
  `android/build.gradle`, injected by a config plugin through `withProjectBuildGradle`. Version
  independent and survives SDK bumps, but invisible to the declared mode — a forced coordinate still
  reports as a finding there. Nothing does this yet; `plugins/` holds only `withMMKVNoBackup.js`.
- **`pnpm patch`** can edit a package's `android/build.gradle` directly and fixes both modes, at the
  cost of pinning the package version — `patchedDependencies` keys on an exact version, so any bump
  breaks `pnpm install`. That is why the one patch we have (`expo-blur@15.0.8`) is exact-pinned and
  ignored in Dependabot.
- **iOS** has no usable equivalent — only a `withPodfile` rewrite (`patchable: "podfile"`).
- **Updating npm does not fix a native version.** Measured: every published `expo-file-system` and
  `@expo/log-box` through the SDK 58 canary declares the same `commons-io:1.4` and `gson:2.8.6`.

## Registry

Same conventions in both files. Native adds `ecosystem` (`Maven` | `CocoaPods`; a CocoaPods `package`
is a bare pod name) and `patchable` (`repo` | `resolutionStrategy` | `rn-upgrade` | `podfile`), and
its thresholds are per context rather than global, because the high-severity findings sit in
development UI while the ones inside the wallet's file path are moderate. The JavaScript registry
keys an entry by advisory and package and records `paths` instead.

**An exception is a claim the gate re-checks every run**, not a suppression: `STALE` when the
advisory leaves the graph, `ESCALATED` when severity grows, `CONTEXT` when a claim that the code
never runs (`dev`/`test` natively, `build`/`dev` in JavaScript, which has no `test` context) meets a
runtime coordinate, `EXPIRED` when its date passes, `NEW` for a finding nobody has reviewed.
`rationale` is the trigger condition that is not met — a dependency path is not a rationale.
`expires` is when the argument must be made again; every entry today is written 90 days out. Nothing
validates that window and nothing warns beforehand, so a lapsed entry reds whichever run is next,
which is why the failure line prints `owner`.

**A native exception is keyed by advisory, coordinate *and* `version`, and `version` is required.**
Every rationale here is a claim about one version's code, so an entry that followed a coordinate
across an SDK bump would be excusing an argument nobody made. When the coordinate moves, the entry
reds as `STALE` naming the version the advisory now reaches and the finding on the new version reds
as `NEW`: two lines, one edit. Write `"version": "*"` for a genuinely version-independent argument;
nothing does today, and the wildcard has to be explicit because the failure mode of an implicit one
is silence. Two entries the matcher cannot tell apart are a validation error rather than one silently
winning — with the other's expiry never checked.

**The `policy` block is validated as strictly as an exception.** `blockingSeverities` written as a
string makes `includes` a substring test, a context key with a typo in it is read by nothing, and
every `VALID_CONTEXTS` entry must have a threshold — each of those otherwise leaves the gate
reporting a clean run. Same for `severity` everywhere: membership is checked with `Object.hasOwn`,
never `in`, because `in` walks the prototype chain and `"constructor"` would pass, rank as a
function, and disable `ESCALATED` for that entry. A severity no lookup can rank reads as `high`.

Two native entries live today, both expiring **2026-12-02**, both argued from reachability rather
than severity, with the measurement written out in `native-advisories.json`:

- `gson 2.8.6` (`rn-dev`) — the classes ship, but `ExpoLogBoxPackage` returns `emptyList()` unless
  `BuildConfig.DEBUG && BuildConfig.EXPO_UNSTABLE_LOG_BOX`, both false in release.
- `commons-io 1.4` (`runtime`) — nothing calls the vulnerable `FilenameUtils.normalize`. This one
  does execute, so the entry records the fix rather than dismissing it: force 2.16.1, after release
  testing of the download, cache and import flows.

The JavaScript registry holds the two `image-size` advisories — Metro's bundle-time and dev-server
image-header parser, expiring 2026-11-30. Both name `>=2.0.3` as patched and npm has no such
version: `latest` is 2.0.2, itself vulnerable, and Metro's `^1.0.2` resolves 1.2.1, the newest of
the 1.x line, published under the `legacy` tag. So an override cannot close them — closing them
means forcing Metro across a major, not a version bump.

## Dependabot

Covers JavaScript and Actions only; it finds and proposes, the gates block. Alerts know nothing about
the registries, so treat the Security tab as an inbox: answer an alert with an override or an
exception, then dismiss it pointing at whichever landed. Never dismiss on its own reasoning.

- **Do not widen `ignore` casually.** The Expo/React Native surface is ignored because the SDK moves
  as one unit. Ignoring by bare `dependency-name` also suppresses security updates — only an `ignore`
  written with `update-types: version-update:semver-*` leaves those working. Dependabot does not read
  `minimumReleaseAge`, so its `cooldown` mirrors it by hand.
- **Do not add a `gradle` ecosystem.** Measured: the dependency graph holds 1289 npm and 10 Actions
  packages and **zero Maven**, because GitHub does not read module `build.gradle` files. A Gradle
  entry would add update pull requests, not coverage. Android detection is the native gate's job
  alone.

## The file contract

`native-audit parse` writes the files everything downstream reads — `android-coordinates.json`,
`aab-coordinates.json` and `ios-pods.json`, each carrying `schema`, `kind`, `source`, `capturedFrom`
and the `build` record `fetch-graphs.mjs` wrote, plus per-entry `graph` and `declaredBy`,
`sha256`/`repository` on Android and `source`/`queryable` on iOS. `queryable` is the whole iOS story
in one field: true only for pods from a spec repo. An Android document also carries `label` — `apk`,
`aab` or `gradle`, the artifact it describes — because a run that gates two of them has to name which
one a finding is in; a document written before that field existed reads as `graph`. The gate's loader
keeps `sha256` and drops `repository`: the repository is captured for the record only.

## Retention is GitHub releases, and GitHub pulls

Every EAS build record, artifact and job run expires 30 days after creation (`Build.expirationDate`,
`JobRun.expiresAt`) and there is no retention setting anywhere, so the graphs have to be copied out.
Release assets never expire, which is why they are the destination; the direction is GitHub pulling
from EAS, never EAS pushing, because pushing needs a GitHub write token inside the EAS environment.

- `.github/workflows/release-draft.yml` — on a merged pull request from
  `release/<major>.<minor>.<patch>` into master, drafts `v<version>` targeted at **the merge commit's
  SHA** (a branch name would let the tag land wherever master points when the draft is published).
  The version comes from `apps/mobile/package.json` and must equal the branch's; a `release/*` branch
  naming no version (`release/desktop`) is not a release and not an error either.
- `.github/workflows/release-assets.yml` — takes a tag or picks the oldest waiting draft, has
  `apps/mobile/scripts/release/` download that commit's artifacts, uploads them with `gh` and
  publishes the draft as a prerelease, which is what makes GitHub create the tag. Called after the
  draft, on a schedule twice an hour, and by hand; one draft per run.
- **The two credentials never meet, and it is the workflow that guarantees it.** `gh` runs only in
  the steps holding `GH_TOKEN`; the download step gets `EXPO_TOKEN` and runs node through
  `env -u GH_TOKEN -u GITHUB_TOKEN`, so the process that talks to Expo and reads a third-party
  build's output cannot write to the repository. Same reasoning as the gate keeping `EXPO_TOKEN` in
  one step, and the reason the script has no GitHub code at all.
- **`stage` exits 75 for "the run has not finished", not 1.** EX_TEMPFAIL, because node exits 1 when
  it crashes: with 1 meaning both, a broken script would read as a build still in progress and wait
  out the 30 days in silence. The same reasoning makes a project the token cannot see an error rather
  than an empty run list — a missing `app.byId` throws, while an empty `edges` array stays the
  ordinary wait.
- **The GitHub-side `EXPO_TOKEN` only reads**: one GraphQL query, and the archives come from
  pre-signed URLs needing no header at all. So it wants a **robot user** rather than a personal
  token, which acts as the human across every account they belong to. Expo has **no per-project
  scoping and no read-only flag** — the account-wide role is the only dial, so start at `Viewer`,
  check with `node apps/mobile/scripts/release/index.mjs plan --commit <sha>`, and raise it to
  `Developer` only if that comes back empty-handed (`Viewer` is documented in terms of Expo Go, not
  the API, so it has to be tried rather than assumed).
- **The match is run-scoped, and per job.** `workflowRunsPaginated(filter: { requestedGitRef:
  "refs/heads/master" })`, then the commit, then `build_ios`, `build_android`, `build_android_play`
  and `security_gate` each `SUCCESS` — not the run's own status, because a Maestro flake fails the
  run and must not hold a release. Two master runs can carry the same `appVersion` (the
  `release/1.2.3` merge and a later `fix/*` merge), so the version is not a key and the commit is. A
  run started with `eas workflow:run` has no ref and is skipped deliberately.
- Seven assets: `safely-<version>-<build>.ipa|apk|aab` (44 / 216 / 146 MiB), `ios-Podfile.lock`,
  `android-sdkDependencies.txt` and `android-dependencies.pb` from each build's `buildArtifactsUrl`
  — **pre-signed for 15 minutes**, so query and download in one pass — and
  `native-graphs-<version>.tar.gz`, the gate's own `native-dependency-graphs` artifact. A URL the run
  should have and does not fails the workflow: published incomplete is worse than published late.
- Nothing to attach yet is a **silent success**; only a real failure reds the run. There is no
  notification by design — a draft release is watched by the person who merged it.

## Also open

The declared mode blocks on `okhttp`/`okio` that never ship, which is why nothing runs it
automatically; `rn-dev` cannot be verified from a configuration name; the 36 declarations with no
statically resolvable version are reported but never gated, and only a resolved graph covers them;
the map form (`implementation group: "g", name: "a", version: "1.0"`) is read by nothing, and no
package in this tree uses it; the APK-versus-bundle graph difference is still unmeasured on one
commit; and `Podfile.lock` carries podspec checksums rather than artifact digests, so iOS has no
equivalent of the Android sha256 — which is itself captured and never verified, along with the
`repository` each coordinate came from.
