# Security Policy

Safely is a self-custody wallet: a vulnerability here can cost users their funds. We take every
report seriously and appreciate responsible disclosure.

## Reporting a vulnerability

**Do not open a public issue, pull request or discussion for a security problem.**

Email **security@safely.app** with:

- the affected component (`apps/mobile`, `packages/sync`, `packages/slottree`, …) and version or
  commit;
- a description of the issue and its impact;
- steps to reproduce or a proof of concept;
- any suggested fix, if you have one.

Never include a real mnemonic, private key or xprv/xpub in a report — use a throwaway test wallet.

## What to expect

- acknowledgement of your report within 3 business days;
- an initial assessment within 10 business days;
- updates as the fix progresses, and credit in the release notes once it ships, unless you prefer to
  stay anonymous.

Please give us a reasonable time to release a fix before any public disclosure; we will agree on a
disclosure date with you.

## Scope

In scope: the code in this repository — key derivation and storage, transaction signing, the E2EE
sync protocol and its state format, device onboarding, and the mobile app.

The sync protocol's security goals, assumptions and accepted risks are described in
[`packages/sync/doc/threat-model.md`](packages/sync/doc/threat-model.md); risks listed there as out
of scope or accepted are not treated as vulnerabilities unless you show that they break a stated
goal.

Out of scope: vulnerabilities in third-party dependencies without a demonstrated impact on Safely,
attacks requiring a device that is already fully compromised (rooted/jailbroken with malware),
social engineering, and denial of service against our infrastructure.

## Supported versions

Security fixes land on `master` and ship in the next release of the app. Only the latest released
version receives fixes.
