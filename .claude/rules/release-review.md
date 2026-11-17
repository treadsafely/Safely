---
paths:
  - '.claude/workflows/release-review.js'
---

# Deep review before a release

`claude-review.yml` reviews each pull request under a tight budget and stays silent unless it finds
something critical. A release branch merging into `master` carries weeks of such pull requests, and
no single pass sees the whole: which shared change one app consumes differently, which persisted key
an older device still reads, which send path now signs something else. Before that merge the branch
gets a deep review, run locally by the `release-review` workflow in `.claude/workflows/`.

## Running it

1. `git fetch origin`, then check out the release branch in a **clean** working tree at the commit to
   be merged: reviewers read files from the working tree but take the diff from committed history,
   so uncommitted edits mix in silently (the report flags a dirty tree). The workflow never fetches,
   and it compares against `origin/master`: the local `master` goes stale behind a release branch,
   which both drags already-released code into the range and hides `master` commits the branch has
   not taken in. Take `master` in first if it moved (`release.md`); the report shows how many of its
   commits are missing and the base sha it measured against.
2. Ask Claude Code to run the `release-review` workflow. Args, all optional:
   `{full: true}` forces a full run; `base` (`origin/master`) and `head` (`HEAD`) set the range;
   `focus` adds emphasis to every reviewer; `chunkLines` (1200) sets the area chunk size.
3. Triage the report it writes to `.release-reviews/<branch>/<sha>.md`.

## Full and incremental runs

Every run writes `.release-reviews/<branch with / as ->/<short sha>.md` (to read) and `.json` (the
findings with their status, read by the next run). The directory is gitignored: reports stay on the
machine that ran them.

- **Full** — no previous report for the branch, `full: true`, or the previous report's commit is not
  an ancestor of `HEAD` (rebase, force-push). Reviews the whole release diff `origin/master...HEAD`.
- **Incremental** — the default once a report exists. Reviews only the files changed since the
  previous report's commit that are still part of the release diff, so changes taken in from
  `master` are not reviewed again. Every finding left open by the previous report is re-checked
  against `HEAD` and either moves to "fixed" or is carried over. The new report holds the whole open
  state, so the newest file is always the release's status.

## What it does

- **Prepare** — finds the previous report and picks the mode, then lists the changed files, the
  commit count and how far the branch is behind `master`. The generated OpenAPI client,
  `styled-system/`, snapshots and binaries are skipped and listed; the lockfile is named only to the
  supply-chain reviewer, which also runs alone when an incremental run finds nothing else changed.
- **Review**, all in parallel:
  - **area reviewers** — every file goes to the first matching entry of `AREAS` (sync, core, ux,
    web-ui, desktop main/preload/native, desktop renderer, mobile native, mobile, other packages,
    docs and rules, CI and release infra), cut into chunks of ≤ `chunkLines` changed lines and ≤ 25
    files. Each prompt names the area's risks and the rules file holding them.
  - **cross-cutting lenses** (`LENSES`) — secrets and keys, persisted/synced state and compatibility
    with devices on the previous release, cross-platform parity, money and transactions end to end,
    release readiness.
  - **security reviewers** (`SECURITY`) — XSS and rendering, supply chain, untrusted input and
    parsing, cryptography, local device protection, CI/CD, privacy and network. Each finding must
    name an attacker the sync threat model counts, the entry point and the gain.
  - **gates** — one agent runs `compile`, `lint`, `test`, `test:scripts`, `check:unicode` and
    `dependencies-audit`, reporting `pass`, `fail` or `env-error` (sandbox, network: rerun by hand).
  - **re-checks** of the previous report's open findings, in incremental mode.
- **Verify** — new findings are deduplicated (same file, lines within 3; a duplicate of a carried
  finding is dropped), then each faces verifiers told to refute it: critical gets reachability,
  reproduction and intent, high the first two, medium and low reproduction only; a security finding
  also gets exploitability against the threat model. All stand → confirmed, some → disputed, none →
  refuted. The severity becomes the lowest one a standing verifier assigned.
- **Report** — one agent writes the `.md` and `.json`; the workflow also returns the markdown.

A full run on a minor release (~370 files) is about 36 reviewers, the gates agent and 1–4 verifiers
per finding; an incremental run scales with what changed. Raise `chunkLines` to trade depth for cost.

## Reading the report

- **Gates** failing with `fail` block the merge; `env-error` means the gate did not run — run it by
  hand.
- **Confirmed critical/high** block the merge: fix on the release branch, or record why it ships.
- **Disputed** needs a human decision — read the verifier reasoning, not just the verdict.
- **Refuted** is listed so a dismissal can be checked, not to be acted on.
- **Coverage** lists files no reviewer reported examining and reviewers that failed: review those
  by hand or re-run with `focus` on them. Resume an interrupted run with its run id instead of
  starting over.

## Keeping it current

`AREAS`, `LENSES` and `SECURITY` mirror the repository map in `CLAUDE.md` and the risks in the rules
files; `GATE_COMMANDS` mirrors the Commands section. A package or app added, a directory moved, a
new rules file with risks a reviewer should check, a gate added — update the matching entry in the
same change. A path no area matches falls into `release-infra`, so a miss is silent.
