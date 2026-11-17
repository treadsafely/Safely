export const meta = {
  name: 'release-review',
  description:
    'Deep pre-release review of a release branch against master: area reviewers, cross-cutting and security lenses, mechanical gates, adversarial verification; incremental when a previous report exists',
  whenToUse:
    'Before a release/* branch merges into master, on a clean checkout of that branch after `git fetch origin`. Args: {full?: boolean, base?: "origin/master", head?: "HEAD", focus?: string, chunkLines?: number}',
  phases: [
    { title: 'Prepare', detail: 'previous report, mode, changed files' },
    { title: 'Review', detail: 'area chunks, lenses, security reviewers, gates, re-check of open findings' },
    { title: 'Verify', detail: 'independent refutation attempts per new finding' },
    { title: 'Report', detail: 'write .release-reviews/<branch>/<sha>.md and .json' },
  ],
}

const opts = args || {}
// The local master goes stale behind a release branch; origin/master is what the merge will meet.
const BASE = opts.base || 'origin/master'
const HEAD = opts.head || 'HEAD'
const RANGE = `${BASE}...${HEAD}`
const CHUNK_LINES = opts.chunkLines || 1200
const CHUNK_FILES = 25
const FOCUS = opts.focus ? `\nExtra focus requested for this run: ${opts.focus}\n` : ''
const REPORTS_DIR = '.release-reviews'

const SEVERITIES = ['critical', 'high', 'medium', 'low']
const RANK = { critical: 0, high: 1, medium: 2, low: 3 }

const SKIP = [
  /^packages\/sync\/src\/api\/generated\//,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)styled-system\//,
  /\.snap$/,
  /\.(png|jpe?g|gif|webp|ico|icns|svg|ttf|otf|woff2?|mp4|mov)$/i,
]

const AREAS = [
  {
    key: 'sync',
    match: (p) => /^packages\/(slottree|sync|sync-storage)\//.test(p),
    focus:
      'E2EE sync, the CRDT slot tree and the versioned state schemas. Check conformance with packages/sync/doc/spec.md, packages/sync/doc/threat-model.md and packages/slottree/docs/*.md: nothing in plaintext reaches the server, key hierarchy and device onboarding/list invariants hold, merge and cbor encoding stay deterministic, a schema version bump comes with a migration that is idempotent and safe for devices still on the previous release.',
  },
  {
    key: 'core',
    match: (p) => p.startsWith('packages/core/'),
    focus:
      'Wallet domain: BTC amounts and units (sat vs BTC, number vs bigint, rounding; amount formatting per .claude/rules/amount-input.md), PSBT construction and signing, fee estimation, address and network handling, Ledger and Flame flows, validation of external API responses, swallowed errors, sensitive data reaching logs without filterSensitiveData.',
  },
  {
    key: 'ux',
    match: (p) => p.startsWith('packages/ux/'),
    focus:
      'Shared React layer: react-query keys and invalidation, zustand stores, xstate v5 machines (unhandled events, invoke without onError, unreachable states), hook rules and stale closures, effects without cleanup, the send form amount input (.claude/rules/amount-input.md), strings outside i18n, en/ru key parity, import cycles that break module-load helpers such as defineQueryKeys.',
  },
  {
    key: 'web-ui',
    match: (p) => p.startsWith('packages/web-ui/'),
    focus:
      'Web design system and screens: Panda extracts styles statically, so a runtime value in a style silently yields no CSS (.claude/rules/web-ui.md); flows driven over @safely/ux; dialogs, focus and keyboard handling; send and Ledger flows; no platform code in the package.',
  },
  {
    key: 'desktop-main',
    match: (p) =>
      /^apps\/desktop\/(src\/(main|preload|shared)\/|native\/|signing\/|forge\.config|.*\.plist$|.*entitlements)/.test(p),
    focus:
      'Electron main/preload and native code: contextIsolation, sandbox and nodeIntegration, IPC channel validation and the preload surface, navigation and window-open handling, shell.openExternal on untrusted input, CSP, the keychain addon and the secret store scopes (.claude/rules/desktop-secret-store.md), passcode, lockout and Touch ID, Mac App Store sandbox entitlements and signing (.claude/rules/desktop-signing.md).',
  },
  {
    key: 'desktop-renderer',
    match: (p) => p.startsWith('apps/desktop/'),
    focus:
      'Desktop renderer and platform adapters: DI interface implementations, routing that drives the web UI, the security module UI, QR (.claude/rules/desktop-qr.md) and Ledger (.claude/rules/desktop-ledger.md) integration, build configuration.',
  },
  {
    key: 'mobile-native',
    match: (p) => /^apps\/mobile\/(modules\/|plugins\/|app\.(config\.ts|json)$|eas\.json$|\.eas\/)/.test(p),
    focus:
      'Native modules and app configuration: Swift/Kotlin correctness and threading, *Core types and their host tests, Android R8 minification of anything reached by reflection or JNI (.claude/rules/android-minification.md), permissions and their usage strings, config plugins, EAS profiles.',
  },
  {
    key: 'mobile',
    match: (p) => p.startsWith('apps/mobile/'),
    focus:
      'React Native app: list and animation performance, effects and listeners without cleanup, keyboard and gesture handling (release-only breakage under R8), secure storage of secrets, deep links, navigation state, unistyles fed only from the shared tokens.',
  },
  {
    key: 'packages-other',
    match: (p) => p.startsWith('packages/'),
    focus: 'Shared package code outside the main layers: correctness, error handling, platform assumptions.',
  },
  {
    key: 'docs-and-rules',
    match: (p) => /^(\.claude\/|CLAUDE\.md$)|\.md$/.test(p),
    focus:
      'Instructions and docs: every statement about behaviour, commands, file paths or workflows matches the code on this branch; no secrets, real addresses or user data; nothing describes a state the diff removed.',
  },
  {
    key: 'release-infra',
    match: () => true,
    focus:
      'CI, release workflows, scripts and root configuration: the release scheme in .claude/rules/release.md and scripts/release/, app versions, workflow logic that would build, sign, tag or publish the wrong thing, eslint and tooling changes that weaken a check.',
  },
]

const LENSES = [
  {
    key: 'secrets-and-keys',
    prompt:
      'Trace every secret the diff touches or could expose: mnemonic, private keys, xprv, sync and E2EE keys, passcode, Ledger data. Where is it created, held in memory, persisted, logged, sent over IPC, the network or the sync channel? Logging must go through the logger with filterSensitiveData, never console. Secrets must stay in the platform secret store and never reach the server unencrypted.',
  },
  {
    key: 'state-and-compat',
    prompt:
      'Find every change to persisted or synced state: IStorage keys, sync-storage schema versions, slottree layout, zustand persist, react-query persisted cache, keychain items, desktop secret-store items. Users run several devices that update at different times, so for each change check that a device on this release and a device on the previous release still sync without data loss or crash, that migrations are idempotent, and that a renamed or removed key has no residual readers.',
  },
  {
    key: 'cross-platform',
    prompt:
      'Check that shared code and both apps still agree: a changed DI interface (IStorage, ISecretEncryptor, QrScanner, IPushNotifications, SafelyFlame, SafelyCrypto, …) has every implementation in mobile and desktop updated; a changed or removed export, enum value, route, query key or translation key has no stale references (grep the old name); every en.json key exists in ru.json; a feature changed in @safely/ux behaves correctly on both mobile and web-ui; colour or spacing literals bypass the shared theme tokens.',
  },
  {
    key: 'money-and-transactions',
    prompt:
      'Follow the send and receive paths end to end through core, ux, web-ui and mobile as changed by this diff: amount units and conversion, rounding, fee and change computation, dust, max-send, address and network validation, PSBT build/sign/finalise, Ledger signing, confirmation screens showing what is actually signed, transaction history and balances. Any path that can sign or broadcast something other than what the user confirmed is critical.',
  },
  {
    key: 'release-readiness',
    prompt: `Check that the branch is shippable: app versions in apps/*/package.json match the branch name per .claude/rules/release.md and scripts/release/release-scheme.mjs; debug flags, dev or test endpoints, testnet/devnet defaults, mocked data or temporarily disabled checks left in shipped code; TODO/FIXME added by this diff on a user-facing path; permission usage strings and entitlements a store review would reject. Also run \`git rev-list --count ${HEAD}..${BASE}\`: a non-zero count means ${BASE} has commits the release branch has not taken in, which release.md requires before the merge.`,
  },
]

const SECURITY = [
  {
    key: 'xss-and-rendering',
    prompt:
      'Untrusted data reaching a renderer: dangerouslySetInnerHTML, innerHTML, markdown or HTML rendering, href/src built from data (javascript:, data:, file: schemes), window.open and links to external sites, CSP in the desktop renderer. Untrusted sources include anything synced from other devices, wallet and account labels, external API responses (price, rate, exchange, Flame RPC, explorers), QR and clipboard content, Ledger responses. In the desktop app a renderer XSS reaches the preload API and through it IPC and the secret store, so rate it by what the preload exposes.',
  },
  {
    key: 'supply-chain',
    prompt: `Dependency and build-input changes: every package.json dependency added, removed or bumped (read \`git diff ${RANGE} -- pnpm-lock.yaml\` for what actually resolves, including transitive additions); packages with install scripts or native code and the pnpm settings that allow them to build; git, tarball or non-registry resolutions; overrides and patches; versions pinned outside the catalog or bypassing minimumReleaseAge in pnpm-workspace.yaml; new exceptions in security/dependency-advisories.json against .claude/rules/dependency-security.md; GitHub Actions referenced by tag instead of a full commit SHA, new third-party actions; Expo config plugins, CocoaPods and Gradle dependencies. Name the package and version in each finding.`,
  },
  {
    key: 'untrusted-input',
    prompt:
      'Every entry point that takes attacker-controllable input: deep links and universal links, QR payloads (BIP21 URIs, PSBTs, addresses, sync onboarding codes), clipboard, push notification payloads, sync server responses and SSE events (the server is untrusted per the threat model), external API responses, Ledger device responses, files the user opens. Check validation before use, parsing robustness (cbor, JSON, base64/hex, URL) against malformed or oversized input, prototype pollution, and actions taken without user confirmation.',
  },
  {
    key: 'cryptography',
    prompt:
      'Cryptographic code and its use: randomness source (never Math.random for anything secret), nonce/IV uniqueness, AEAD with associated data bound to the context it protects, KDF choice and parameters, key separation in the key hierarchy, non-constant-time comparison of secrets or MACs, derivation paths and script types, signature verification actually checked, key material zeroised or kept short-lived where the code intends it. Compare with packages/sync/doc/spec.md and the native SafelyCrypto implementations.',
  },
  {
    key: 'local-protection',
    prompt:
      'Protection of the unlocked app on a device someone else can touch: passcode and lockout bypass (counter reset, timing, race), biometric gate that a fallback path skips, auto-lock and background timers, secrets on screen captured in screenshots or the app switcher (FLAG_SECURE, iOS snapshot), mnemonic or keys left in the clipboard, Android allowBackup and exported components, iOS keychain accessibility class, desktop secret-store scopes (.claude/rules/desktop-secret-store.md).',
  },
  {
    key: 'ci-cd',
    prompt:
      'Workflow and pipeline security in .github and apps/mobile/.eas: expressions from github.event (titles, branch names, bodies) interpolated into run: scripts, pull_request_target or workflow_run checking out untrusted code, fork code next to secrets, token permissions wider than needed, OIDC and environment protection, signing certificates and store API keys reachable from jobs that do not need them (.claude/rules/desktop-signing.md), artifacts and caches that cross a trust boundary, self-hosted runners.',
  },
  {
    key: 'privacy-and-network',
    prompt:
      'What leaves the device: new or changed endpoints and hosts, xpubs, addresses or transaction ids sent to third-party APIs (price, explorer, exchange) in a way that links a user\'s wallets or IP, telemetry and crash reporting payloads, logs shipped off-device, cleartext HTTP, disabled certificate checks, Android network security config, iOS ATS exceptions, desktop session or webRequest settings.',
  },
]

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: SEVERITIES },
          file: { type: 'string' },
          line: { type: 'integer' },
          failure_scenario: { type: 'string' },
          evidence: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['title', 'severity', 'file', 'line', 'failure_scenario', 'evidence'],
      },
    },
    reviewed_files: { type: 'array', items: { type: 'string' } },
  },
  required: ['findings', 'reviewed_files'],
}

const PREVIOUS_FINDING = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    severity: { type: 'string', enum: SEVERITIES },
    status: { type: 'string' },
    file: { type: 'string' },
    line: { type: 'integer' },
    failure_scenario: { type: 'string' },
    evidence: { type: 'string' },
    fix: { type: 'string' },
    sources: { type: 'array', items: { type: 'string' } },
    security: { type: 'boolean' },
  },
  required: ['id', 'title', 'severity', 'status', 'file', 'line', 'failure_scenario', 'evidence'],
}

const STATE_SCHEMA = {
  type: 'object',
  properties: {
    branch: { type: 'string' },
    sha: { type: 'string' },
    dirty: { type: 'boolean' },
    previous_sha: { type: 'string' },
    previous_is_ancestor: { type: 'boolean' },
    previous_open: { type: 'array', items: PREVIOUS_FINDING },
  },
  required: ['branch', 'sha', 'dirty', 'previous_sha', 'previous_is_ancestor', 'previous_open'],
}

const SCOPE_SCHEMA = {
  type: 'object',
  properties: {
    files: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          added: { type: 'integer' },
          deleted: { type: 'integer' },
        },
        required: ['path', 'added', 'deleted'],
      },
    },
    changed_since_previous: { type: 'array', items: { type: 'string' } },
    commits: { type: 'integer' },
    behind_base: { type: 'integer' },
    base_sha: { type: 'string' },
    merge_base: { type: 'string' },
  },
  required: ['files', 'changed_since_previous', 'commits', 'behind_base', 'base_sha', 'merge_base'],
}

const GATES_SCHEMA = {
  type: 'object',
  properties: {
    gates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          command: { type: 'string' },
          status: { type: 'string', enum: ['pass', 'fail', 'env-error'] },
          output_tail: { type: 'string' },
        },
        required: ['command', 'status', 'output_tail'],
      },
    },
  },
  required: ['gates'],
}

const RECHECK_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['fixed', 'open'] },
    file: { type: 'string' },
    line: { type: 'integer' },
    reasoning: { type: 'string' },
  },
  required: ['status', 'file', 'line', 'reasoning'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    refuted: { type: 'boolean' },
    reasoning: { type: 'string' },
    severity: { type: 'string', enum: SEVERITIES },
  },
  required: ['refuted', 'reasoning', 'severity'],
}

const WRITE_SCHEMA = {
  type: 'object',
  properties: { markdown_path: { type: 'string' }, json_path: { type: 'string' } },
  required: ['markdown_path', 'json_path'],
}

const GATE_COMMANDS = [
  'pnpm -r run compile',
  'pnpm lint',
  'pnpm test',
  'pnpm test:scripts',
  'pnpm check:unicode',
  'pnpm dependencies-audit',
]

const fmtFile = (f) => `${f.path} (+${f.added} -${f.deleted})`

function chunkArea(area, files) {
  const chunks = []
  let cur = []
  let lines = 0
  for (const f of files) {
    const size = f.added + f.deleted
    if (cur.length && (lines + size > CHUNK_LINES || cur.length >= CHUNK_FILES)) {
      chunks.push(cur)
      cur = []
      lines = 0
    }
    cur.push(f)
    lines += size
  }
  if (cur.length) chunks.push(cur)
  return chunks.map((c, i) => ({ area, files: c, label: chunks.length > 1 ? `${area.key}#${i + 1}` : area.key }))
}

const near = (a, b) => a.file === b.file && Math.abs(a.line - b.line) <= 3

function dedupe(findings) {
  const out = []
  for (const f of findings) {
    const dup = out.find((o) => near(o, f))
    if (!dup) {
      out.push({ ...f, related: [] })
      continue
    }
    dup.sources = dup.sources.concat(f.sources)
    dup.security = dup.security || f.security
    dup.related.push(`${f.title} — ${f.failure_scenario}`)
    if (RANK[f.severity] < RANK[dup.severity]) dup.severity = f.severity
  }
  return out
}

const VERIFY_LENSES = {
  reachability:
    'Is the code path actually reachable in the shipped app on this branch? Check callers, platform, feature flags and guards upstream. Unreachable → refuted.',
  reproduce:
    'Construct the concrete input or state sequence that produces the failure, step by step, against the real code. If you cannot make it happen → refuted.',
  intent:
    'Is the behaviour intended? Check the specs, .claude/rules, docs and the commits that introduced it. Documented and deliberate → refuted; deliberate but harmful in the way the finding says → not refuted.',
  exploitability:
    'Read packages/sync/doc/threat-model.md. Can an attacker the threat model counts (not one it puts out of scope) actually control the input and reach this code, and does the attack gain them what the finding claims? If not → refuted.',
}
function lensesFor(f) {
  const base =
    f.severity === 'critical'
      ? ['reachability', 'reproduce', 'intent']
      : f.severity === 'high'
        ? ['reachability', 'reproduce']
        : ['reproduce']
  return f.security ? base.concat('exploitability') : base
}

// ---- Prepare

phase('Prepare')
const state = await agent(
  `Collect the state for a release review. Read-only except where told. Run each command separately:
1. \`git rev-parse --abbrev-ref ${HEAD}\` → branch (if it prints HEAD, use \`git rev-parse --short=12 ${HEAD}\` as the branch).
2. \`git rev-parse --short=12 ${HEAD}\` → sha.
3. \`git status --porcelain --untracked-files=no\` → dirty is true when it prints anything.
4. The previous report lives in ${REPORTS_DIR}/<branch with every "/" replaced by "-">/ as <sha>.json files. List that directory with \`ls -t\`; if it is missing or has no .json file, return previous_sha "" , previous_is_ancestor false, previous_open [].
5. Otherwise Read the newest .json. previous_sha is its "sha" field. Run \`git merge-base --is-ancestor <previous_sha> ${HEAD}\`: exit code 0 → previous_is_ancestor true, anything else → false.
6. previous_open is every entry of its "findings" array whose status is "confirmed", "disputed" or "unverified", copied field for field.`,
  { label: 'state', phase: 'Prepare', schema: STATE_SCHEMA, effort: 'low' },
)
if (!state) throw new Error('state agent returned nothing')
if (state.dirty) log('working tree has uncommitted changes to tracked files: reviewers read them, the diff ignores them')

let mode = 'full'
if (opts.full) log('full run requested')
else if (!state.previous_sha) log('no previous report for this branch: full run')
else if (!state.previous_is_ancestor) log(`previous report ${state.previous_sha} is not an ancestor of ${HEAD} (rebase or force-push): full run`)
else mode = 'incremental'
const SINCE = mode === 'incremental' ? state.previous_sha : ''
const previousOpen = mode === 'incremental' ? state.previous_open : []

const scope = await agent(
  `Collect the scope of the release diff. Run each command separately and do not read or review anything:
1. \`git diff --numstat --no-renames ${RANGE}\` — one entry per line: added, deleted, path; a binary file shows "-", record it as 0. Return every file, none dropped.
2. ${SINCE ? `\`git diff --name-only --no-renames ${SINCE}..${HEAD}\` → changed_since_previous.` : 'changed_since_previous is [].'}
3. \`git rev-list --count --no-merges ${BASE}..${HEAD}\` → commits.
4. \`git rev-list --count ${HEAD}..${BASE}\` → behind_base.
5. \`git rev-parse --short=12 ${BASE}\` → base_sha.
6. \`git merge-base ${BASE} ${HEAD}\` → merge_base, shortened to 12 characters.`,
  { label: 'scope', phase: 'Prepare', schema: SCOPE_SCHEMA, effort: 'low' },
)
if (!scope) throw new Error('scope agent returned nothing')

const releaseFiles = scope.files.filter((f) => !SKIP.some((re) => re.test(f.path)))
const skipped = scope.files.filter((f) => SKIP.some((re) => re.test(f.path)))
const sinceSet = new Set(scope.changed_since_previous)
const files = (mode === 'incremental' ? releaseFiles.filter((f) => sinceSet.has(f.path)) : releaseFiles).sort((a, b) =>
  a.path.localeCompare(b.path),
)
const lockChanged = mode === 'full' ? scope.files.some((f) => /pnpm-lock\.yaml$/.test(f.path)) : sinceSet.has('pnpm-lock.yaml')
log(
  `${mode} run at ${state.sha}${SINCE ? ` since ${SINCE}` : ''}: ${files.length} files to review (release diff ${releaseFiles.length}, ${skipped.length} skipped), ${scope.commits} commits, ${scope.behind_base} behind ${BASE}, ${previousOpen.length} open findings carried`,
)

const byArea = new Map()
for (const f of files) {
  const area = AREAS.find((a) => a.match(f.path))
  if (!byArea.has(area.key)) byArea.set(area.key, { area, files: [] })
  byArea.get(area.key).files.push(f)
}
const chunks = [...byArea.values()].flatMap(({ area, files: fs }) => chunkArea(area, fs))
const lenses = files.length ? LENSES : []
const security = SECURITY.filter((s) => files.length || (lockChanged && s.key === 'supply-chain'))
log(`${chunks.length} area chunks, ${lenses.length} lenses, ${security.length} security reviewers, gates, ${previousOpen.length} re-checks`)

const fileList = files.map(fmtFile).join('\n')
const lockNote = lockChanged ? '\npnpm-lock.yaml (changed)' : ''
const SCOPE_NOTE = SINCE
  ? `This is an incremental run: review only what changed in \`git diff ${SINCE}..${HEAD} -- <path>\`, inside the release diff \`git diff ${RANGE}\` which an earlier run already reviewed. Changes in the range that arrived by merging ${BASE} are already released; leave them alone.`
  : `Get a file's change with \`git diff ${RANGE} -- <path>\`, one command per call.`

const COMMON = `You are one reviewer in a deep pre-release review of the Safely wallet (local-first BTC wallet: private keys and the mnemonic never leave the device, state syncs between devices as E2EE snapshots). The release diff is \`git diff ${RANGE}\` (from the merge-base with ${BASE}); the working tree is checked out at ${HEAD}, so Read shows the code that ships.

- Read-only: never edit, write, stage or commit anything; use git only for diff, log, show and blame.
- ${SCOPE_NOTE} Then Read the surrounding code, its callers and callees: a defect usually sits where the diff meets code it did not touch.
- Report defects only: wrong behaviour, security or privacy weakness, data loss or corruption, crash, broken migration or compatibility, release blocker. No style, naming, formatting, refactoring advice, missing tests, or anything tsc or eslint already rejects.
- Every finding needs a concrete failure scenario (input or state → wrong result) and a file:line in the ${HEAD} version. If you cannot state one, leave it out.
- Severity: critical = loss of funds, key/mnemonic/E2EE leak, loss or corruption of synced state, startup crash, store-review blocker; high = wrong behaviour or crash in a main flow, a security weakness exploitable in principle, a migration failing in a realistic case; medium = a bug in a secondary flow or edge case, a user-visible performance regression; low = minor but real.
- reviewed_files lists every changed file you actually examined.
${FOCUS}`

const SECURITY_NOTE = `Read packages/sync/doc/threat-model.md first. Every finding names the attacker (one the threat model counts), the entry point they control and what they gain; a weakness no counted attacker can reach is not a finding.`

// ---- Review: everything independent runs in one barrier, because dedupe needs every finding

phase('Review')
const reviewerTask = (label, source, prompt, isSecurity) => () =>
  agent(prompt, { label, phase: 'Review', schema: FINDINGS_SCHEMA }).then(
    (r) => r && { ...r, source, security: isSecurity },
  )

const reviewTasks = [
  ...chunks.map((c) =>
    reviewerTask(
      `review:${c.label}`,
      c.label,
      `${COMMON}
Your area: ${c.area.key}. ${c.area.focus}

Review these changed files (+added -deleted):
${c.files.map(fmtFile).join('\n')}

Other changed files exist; open them only when needed to judge a file in your list.`,
      false,
    ),
  ),
  ...lenses.map((l) =>
    reviewerTask(
      `lens:${l.key}`,
      `lens:${l.key}`,
      `${COMMON}
You are a cross-cutting lens over the whole diff, not one area: ${l.key}.
${l.prompt}

Changed files in scope (+added -deleted); pick the ones your lens needs:
${fileList}`,
      false,
    ),
  ),
  ...security.map((s) =>
    reviewerTask(
      `security:${s.key}`,
      `security:${s.key}`,
      `${COMMON}
You are a security reviewer over the whole diff: ${s.key}.
${SECURITY_NOTE}
${s.prompt}

Changed files in scope (+added -deleted); pick the ones your topic needs:
${fileList}${s.key === 'supply-chain' ? lockNote : ''}`,
      true,
    ),
  ),
]

const gatesTask = () =>
  agent(
    `Run the repository's mechanical gates from the repository root, one command per Bash call, in this order, each with a 600000 ms timeout, and do not stop at the first failure:
${GATE_COMMANDS.map((c) => `- \`${c}\``).join('\n')}
Follow the local environment instructions for running these (sandbox, vitest) if any apply. Never edit files or try to fix anything. For each command: status "pass" on exit 0; "env-error" when it failed because of the environment (sandbox denial, network or DNS, missing tool) rather than the code; otherwise "fail". output_tail is the last ~30 relevant lines for a failure or env-error, empty for a pass.`,
    { label: 'gates', phase: 'Review', schema: GATES_SCHEMA },
  )

const recheckTasks = previousOpen.map((f) => () =>
  agent(
    `A previous release review at ${SINCE} reported this finding; the working tree is now at ${HEAD} (\`git diff ${SINCE}..${HEAD}\` shows what changed since). Read-only: never edit anything. Decide whether it is fixed at ${HEAD}: "fixed" only when the failure scenario can no longer happen; otherwise "open". Return its current file and line (it may have moved).

Finding ${f.id} (${f.severity}, ${f.status}) at ${f.file}:${f.line}: ${f.title}
Failure scenario: ${f.failure_scenario}
Evidence: ${f.evidence}`,
    { label: `recheck:${f.id}`, phase: 'Review', schema: RECHECK_SCHEMA },
  ).then((r) => r && { ...f, recheck: r }),
)

const results = await parallel([...reviewTasks, gatesTask, ...recheckTasks])
const reviews = results.slice(0, reviewTasks.length)
const gatesResult = results[reviewTasks.length]
const rechecks = results.slice(reviewTasks.length + 1)

const reviewerLabels = [
  ...chunks.map((c) => c.label),
  ...lenses.map((l) => `lens:${l.key}`),
  ...security.map((s) => `security:${s.key}`),
]
const failedReviewers = reviews.map((r, i) => (r ? null : reviewerLabels[i])).filter(Boolean)
if (failedReviewers.length) log(`reviewers that returned nothing: ${failedReviewers.join(', ')}`)
const gates = gatesResult ? gatesResult.gates : []
if (!gatesResult) log('gates agent returned nothing')

const carried = []
const fixed = []
const recheckFailed = []
previousOpen.forEach((f, i) => {
  const r = rechecks[i]
  if (!r) recheckFailed.push(f)
  else if (r.recheck.status === 'fixed') fixed.push({ ...f, note: r.recheck.reasoning })
  else carried.push({ ...f, file: r.recheck.file, line: r.recheck.line, note: r.recheck.reasoning })
})
const stillOpen = carried.concat(recheckFailed)

const raw = reviews
  .filter(Boolean)
  .flatMap((r) => r.findings.map((f) => ({ ...f, sources: [r.source], security: r.security })))
const deduped = dedupe(raw)
const fresh = deduped.filter((f) => !stillOpen.some((o) => near(o, f)))
if (deduped.length !== fresh.length) log(`${deduped.length - fresh.length} new findings duplicate open ones from ${SINCE}`)
log(`${raw.length} raw findings → ${fresh.length} new after dedupe`)

const reviewed = new Set(reviews.filter(Boolean).flatMap((r) => r.reviewed_files))
const unreviewed = files.filter((f) => !reviewed.has(f.path))
if (unreviewed.length) log(`${unreviewed.length} files in scope no reviewer reported examining`)

// ---- Verify

phase('Verify')
const verified = await parallel(
  fresh.map((f, i) => () =>
    parallel(
      lensesFor(f).map((lens) => () =>
        agent(
          `You verify one finding from a pre-release review of the Safely wallet; the working tree is at ${HEAD}, the release diff is \`git diff ${RANGE}\`. Read-only: never edit anything. Try to REFUTE the finding through this lens: ${VERIFY_LENSES[lens]}
Default to refuted=true when the evidence does not hold up. If it stands, give the severity you would assign (critical: funds loss, key/E2EE leak, synced-state loss, startup crash, store blocker; high: main-flow defect; medium: secondary-flow or edge case; low: minor).

Finding (${f.severity}) at ${f.file}:${f.line}: ${f.title}
Failure scenario: ${f.failure_scenario}
Evidence: ${f.evidence}${f.related.length ? `\nNearby findings merged into it: ${f.related.join(' | ')}` : ''}`,
          { label: `verify#${i + 1}:${lens}`, phase: 'Verify', schema: VERDICT_SCHEMA },
        ).then((v) => v && { ...v, lens }),
      ),
    ).then((votes) => {
      const vs = votes.filter(Boolean)
      const standing = vs.filter((v) => !v.refuted)
      const status = !vs.length
        ? 'unverified'
        : standing.length === vs.length
          ? 'confirmed'
          : standing.length
            ? 'disputed'
            : 'refuted'
      const severity = standing.length
        ? standing.map((v) => v.severity).sort((a, b) => RANK[b] - RANK[a])[0]
        : f.severity
      return { ...f, id: `${state.sha.slice(0, 7)}-${i + 1}`, status, severity, votes: vs }
    }),
  ),
)

// ---- Report

phase('Report')
const bySeverity = (a, b) => RANK[a.severity] - RANK[b.severity]
const newBy = (status) => verified.filter((f) => f.status === status).sort(bySeverity)
const confirmed = newBy('confirmed')
const disputed = newBy('disputed')
const unverified = newBy('unverified')
const refuted = newBy('refuted')
const openAll = [...confirmed, ...disputed, ...unverified, ...stillOpen]
const gateFailures = gates.filter((g) => g.status !== 'pass')

const renderFinding = (f) => {
  const votes = (f.votes || []).map((v) => `- ${v.lens}: ${v.refuted ? 'refuted' : `stands (${v.severity})`} — ${v.reasoning}`)
  return [
    `### [${f.severity}] ${f.title}`,
    [`\`${f.id}\``, `\`${f.file}:${f.line}\``, f.sources && f.sources.length && `found by ${f.sources.join(', ')}`]
      .filter(Boolean)
      .join(' · '),
    `**Failure:** ${f.failure_scenario}`,
    `**Evidence:** ${f.evidence}`,
    f.fix && `**Fix:** ${f.fix}`,
    f.related && f.related.length && `**Merged nearby:** ${f.related.join('; ')}`,
    f.note && `**Re-check at ${state.sha}:** ${f.note}`,
    votes.length && votes.join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n')
    .concat('\n')
}

const section = (title, list, render) => [`## ${title}`, '', ...(list.length ? list.map(render) : ['None.']), '']
const counts = (list) => SEVERITIES.map((s) => `${s} ${list.filter((f) => f.severity === s).length}`).join(' · ')

const markdown = [
  `# Release review: ${state.branch} @ ${state.sha}`,
  '',
  `${mode === 'incremental' ? `Incremental since \`${SINCE}\`` : 'Full run'} · range \`${RANGE}\` (${BASE} at \`${scope.base_sha}\`, merge-base \`${scope.merge_base}\`) · ${scope.commits} commits · ${files.length} files reviewed · ${scope.behind_base} commits on ${BASE} not merged in${state.dirty ? ' · **working tree was dirty**' : ''}`,
  '',
  `**Open:** ${counts(openAll)} · **fixed since previous:** ${fixed.length} · **gates failing:** ${gateFailures.length}`,
  '',
  '## Gates',
  '',
  ...(gates.length
    ? gates.map((g) => `- \`${g.command}\`: **${g.status}**`)
    : ['Gates agent returned nothing — run them by hand.']),
  '',
  ...gateFailures
    .filter((g) => g.output_tail)
    .flatMap((g) => [`\`${g.command}\` (${g.status}):`, '', '```', g.output_tail, '```', '']),
  ...section('New — confirmed', confirmed, renderFinding),
  ...section('New — disputed (verifiers split, needs a human call)', disputed, renderFinding),
  ...(unverified.length ? section('New — unverified (every verifier failed)', unverified, renderFinding) : []),
  ...(mode === 'incremental'
    ? [
        ...section(`Still open from ${SINCE}`, stillOpen, renderFinding),
        ...section(`Fixed since ${SINCE}`, fixed, (f) => `- \`${f.id}\` \`${f.file}:${f.line}\` [${f.severity}] ${f.title} — ${f.note}`),
      ]
    : []),
  ...section('New — refuted', refuted, (f) => `- \`${f.file}:${f.line}\` [${f.severity}] ${f.title} — ${f.votes.map((v) => v.reasoning).join(' / ')}`),
  '',
  '## Coverage',
  '',
  failedReviewers.length ? `Reviewers that returned nothing: ${failedReviewers.join(', ')}` : 'Every reviewer returned.',
  '',
  recheckFailed.length ? `Re-checks that returned nothing (kept open): ${recheckFailed.map((f) => f.id).join(', ')}\n` : '',
  unreviewed.length
    ? `Files in scope no reviewer reported examining:\n${unreviewed.map((f) => `- ${fmtFile(f)}`).join('\n')}`
    : 'Every file in scope was examined by at least one reviewer.',
  '',
  `Skipped by rule (generated client, lockfile outside the supply-chain review, styled-system, snapshots, binaries):\n${skipped.map((f) => `- ${f.path}`).join('\n') || '- none'}`,
  '',
].join('\n')

const strip = (f) => ({
  id: f.id,
  title: f.title,
  severity: f.severity,
  status: f.status,
  file: f.file,
  line: f.line,
  failure_scenario: f.failure_scenario,
  evidence: f.evidence,
  fix: f.fix || '',
  sources: f.sources || [],
  security: !!f.security,
})
const json = JSON.stringify(
  {
    branch: state.branch,
    sha: state.sha,
    base: BASE,
    mode,
    previous_sha: SINCE,
    gates,
    findings: [
      ...openAll.map(strip),
      ...fixed.map((f) => ({ ...strip(f), status: 'fixed' })),
      ...refuted.map(strip),
    ],
  },
  null,
  2,
)

const dir = `${REPORTS_DIR}/${state.branch.replace(/\//g, '-')}`
const written = await agent(
  `Write two files and nothing else. Get the repository root with \`git rev-parse --show-toplevel\`, then use the Write tool with absolute paths under <root>/${dir}/ (create the directory if Write requires it). Write each content exactly as given between the markers, byte for byte, without the marker lines.

File 1: ${dir}/${state.sha}.md
<<<CONTENT
${markdown}
CONTENT>>>

File 2: ${dir}/${state.sha}.json
<<<CONTENT
${json}
CONTENT>>>

Return the two absolute paths.`,
  { label: 'write-report', phase: 'Report', schema: WRITE_SCHEMA, effort: 'low' },
)
if (!written) log('report writer returned nothing — the report is only in the returned value')

return {
  report: written ? written.markdown_path : null,
  markdown,
  summary: {
    mode,
    sha: state.sha,
    since: SINCE,
    open: openAll.length,
    critical: openAll.filter((f) => f.severity === 'critical').length,
    high: openAll.filter((f) => f.severity === 'high').length,
    fixed: fixed.length,
    refuted: refuted.length,
    gate_failures: gateFailures.map((g) => `${g.command}: ${g.status}`),
    unreviewed: unreviewed.length,
  },
}
