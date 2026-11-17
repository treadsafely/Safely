---
paths:
  - '.github/workflows/mobile-*.yml'
  - '.github/workflows/desktop-*.yml'
  - '.github/workflows/ci.yml'
  - 'apps/mobile/.eas/workflows/**'
  - 'apps/mobile/scripts/release/**'
  - 'scripts/release/**'
  - 'apps/mobile/package.json'
  - 'apps/desktop/package.json'
---

# Releases: mobile and desktop

Both apps live in one repository and ship through different stores, so a release is either
**synchronous** (both platforms) or **platform-only** (one). The version number says which:
`major.minor` is shared by the platforms, `patch` belongs to each platform alone.

**Everything that belongs to one platform carries its name**: tags, GitHub releases, workflow files,
release assets, branches. The one exception is `release/x.y.0`, shorthand for
`release/mobile-x.y.0-desktop-x.y.0`.

## Versions

- The version of an app is the `version` in its `package.json` (`apps/mobile/package.json`, read by
  `app.config.js`; `apps/desktop/package.json`, read by forge). The branch name is checked against
  it, never the other way round.
- `x.y.0` is a synchronous release: both apps carry exactly `x.y.0`.
- `x.y.z` with `z ≥ 1` is a platform-only release inside the shared `x.y`. `z` counts that
  platform's releases, it does not mean "fixes only": a small platform-only improvement (UI polish)
  ships as `z` too.
- Patches of the two platforms are independent: `v1.5.3-mobile` and `v1.5.3-desktop` are different
  builds with different contents. Only `x.y` is comparable across platforms.
- Build numbers are separate from all of this: EAS keeps mobile's remotely (`appVersionSource:
  remote`), `DESKTOP_BUILD_NUMBER_MACOS` keeps desktop's (`desktop-signing.md`).

## Branches

| Branch | Ships | `package.json` on the branch |
| ------ | ----- | ---------------------------- |
| `release/x.y.0` | both platforms | both apps `x.y.0` |
| `release/mobile-x.y.z` (`z ≥ 1`) | mobile only | mobile `x.y.z`; `x.y` is the minor both apps have on master; desktop untouched |
| `release/desktop-x.y.z` (`z ≥ 1`) | desktop only | the same with the platforms swapped |

Every released version is newer than the platform's newest tag. A platform release is impossible
until both apps share a minor on master, so the first release that aligns them is synchronous.

- **Every release branch is cut from `master`, and `master` holds only released app code.** Feature
  pull requests target the open release branch; a release branch is merged into `master` only once
  it is ready for store review. Nothing unfinished reaches `master`, so a platform-only branch cut
  from it cannot pick up half of the next minor.
- **Maintenance merges are the other way into `master`**: a branch outside `release/*` (CI and
  GitHub Actions, service configuration, repository settings) merges directly and runs no CD
  pipeline — no build, no store upload, no tag, no release. It must not change what an app ships:
  app or package code that reaches `master` this way goes out unreviewed for release with the next
  release branch cut from it. Nothing enforces this. **When preparing or reviewing a pull request
  into `master` from a branch outside `release/*`, flag every changed path under `apps/**` or
  `packages/**`** and ask whether it belongs on a release branch instead — the EAS workflow files
  in `apps/mobile/.eas/` included.
- **A release branch gets a deep review before its merge into `master`**: the `release-review`
  workflow, run locally on a clean checkout of the branch (`release-review.md`).
- **A long-lived `release/x.y.0` must take in `master` before its own merge**: platform-only
  releases may have shipped meanwhile, and their fixes — shared code included — would otherwise be
  lost. The version conflict this produces resolves to `x.y.0`.
- **Platform-only or synchronous is a reviewer's call, not CI's.** A platform-only branch may touch
  shared packages (`packages/*`) for a fix. Substantial changes to shared code go out as a
  synchronous release, even when one platform has no UI for the feature yet: both apps then ship and
  get tested on the same shared code, which keeps the next release from carrying a regression in.
- Platform names are joined with `-`, never `/`: the repository rulesets and the `desktop-release`
  environment match `release/*`, and `*` stops at `/`, so `release/mobile/1.5.1` would build
  outside the ruleset (`desktop-signing.md`).

## The check

`scripts/release/` (`release-scheme.mjs`, tested by `pnpm test:scripts`) is the one definition of
the rules above and of the tag format: which platforms a branch releases and under which tag is
decided there only. Workflows merely pick `release/*` candidates by prefix and pass them on.
`node scripts/release/index.mjs --help` lists the commands:

- `check --branch <b> --base <rev> [--platform <p>] [--allow-released]` reads both `package.json`
  files at the checkout and at `--base`, plus the `v*` tags, and prints `mobile=`/`desktop=` (the
  versions the branch releases, empty when out of scope) and `<p>-tag=`, `<p>-previous-tag=`,
  `<p>-released=` for each platform it checked. `--platform` limits the tag comparison to one
  platform, so one half of a synchronous release does not trip over the other half's tag.
  `--allow-released` turns a version that is already tagged into `<p>-released=true` instead of a
  failure — how a re-run after publishing ends quietly. Mobile's pre-scheme tags `v<x.y.z>` count
  as mobile.
- `scope --branch <b>` — the same `mobile=`/`desktop=` from the name alone, no git; what EAS uses.
- `tag --platform <p> --version <x.y.z>` — the tag of a hand-dispatched desktop release.

**Exit codes carry the decision**: 0 ok, 1 the release breaks the scheme, 2 bad input or a git
failure (never 1, so a crash cannot read as a scheme violation), **3 the branch is outside the
scheme** — `release/hotfix-x`, `release/1.4.1`, `release/mobile-1.5.0`. A branch outside the scheme
gets no release, no tag and no deployment anywhere, and is refused as early as possible:

| Where | When | `--base` | Exit 3 means |
| ----- | ---- | -------- | ------------ |
| `ci.yml`, `release-scheme` | a pull request from `release/*` into master | `HEAD^1` — the checkout is the pull request merged into master | the pull request fails |
| EAS `prepare` (`scope`) | a push to a mobile branch | — | the run fails before any build |
| `desktop-staging.yml`, `check` | a push to a desktop branch, before a build number is spent | the merge-base with `origin/master` — master's tip may carry a platform release merged meanwhile | the run fails before any build |
| EAS `prepare` (`scope`) | a push to master | — | no mobile build, no Play upload — as for every push to master that is not the merge of a branch shipping mobile |
| `mobile-release-draft.yml` | the merge, mobile half | `HEAD^1` of the merge commit | notice, no draft, no tag |
| `desktop-release.yml`, `prepare` | the merge, desktop half | `HEAD^1` of the merge commit | notice, no build, no tag |

The pull request check stops a wrong name only if `release-scheme` is a **required status check** of
the master ruleset; without that, the merge goes through and the post-merge workflows merely skip.

## Pipelines

| Platform | Tester builds (push to its branches) | Release (merge into master) |
| -------- | ------------------------------------ | --------------------------- |
| mobile | `apps/mobile/.eas/workflows/mobile-build-and-distribute.yml` on `release/*.*.0`, `release/mobile-*` → TestFlight, Firebase | `mobile-release-draft.yml` drafts `v<x.y.z>-mobile` on the merge commit; `mobile-release-assets.yml` attaches the EAS builds of that commit and publishes it |
| desktop | `desktop-staging.yml` on `release/*.*.0`, `release/desktop-*` → TestFlight | `desktop-release.yml` builds the merge commit, uploads it to TestFlight and publishes `v<x.y.z>-desktop` |

- A synchronous merge produces **two GitHub releases**, one per platform, each tagging the same merge
  commit. Both have GitHub-generated notes starting at the previous tag of the **same** platform —
  never the other platform's, which shares the tag list. Mobile appends the build table of its EAS
  run; desktop leads with its build number and commit. A platform's first release has no previous
  tag and gets a fixed line instead.
- Each platform is published only after its own build succeeded, and the halves are independent: a
  synchronous release where one platform fails is half released until that half is re-run. A store
  rejection after that is fixed as the next platform-only patch.
- **On `master` the EAS workflow builds only the merge of a branch that ships mobile** — that build is
  what `mobile-release-assets.yml` attaches, and it sends the AAB to Play's internal track. EAS cannot
  look up the pull request, so `prepare` reads the branch out of GitHub's merge commit message
  (`Merge pull request #n from <owner>/release/…`) and asks `scope`; every other push to `master` —
  a maintenance merge, a squash — builds nothing. **A release branch is therefore merged with a merge
  commit**: squashed, its mobile half gets no build, and `mobile-release-draft.yml` fails rather than
  leave a draft waiting for artifacts that never come. Maintenance branches may be squashed.
- `desktop-release.yml` needs no message: it looks the pull request up through the API and builds
  only for a release branch that names desktop.
- Assets: mobile `safely-mobile-<version>-<build>.ipa|apk|aab`, `mobile-ios-Podfile.lock`,
  `mobile-android-sdkDependencies.txt`, `mobile-android-dependencies.pb`,
  `mobile-native-graphs-<version>.tar.gz`; desktop `safely-desktop-<version>-b<build>.pkg`,
  `desktop-dependencies.txt`.
- Releases stay prereleases until the store rollout, which is done by hand (App Store Connect, Play
  Console).
- Older tags keep their former shape (`v1.3.2` and earlier for mobile) and are not renamed.
- **A pre-scheme mobile draft is not completed any more.** `mobile-release-assets.yml` picks only
  `v<x.y.z>-mobile` drafts, and `apps/mobile/scripts/release/` matches only runs of
  `mobile-build-and-distribute.yml`, so a `v<x.y.z>` draft, or a commit EAS built under the old
  `build-and-distribute.yml`, is matched by neither. None was open when the scheme landed; one that
  turns up is published by hand or released again under the scheme.
