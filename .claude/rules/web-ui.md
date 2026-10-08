---
paths:
    - 'packages/web-ui/**/*.{ts,tsx}'
    - 'packages/web-ui/panda.config.ts'
    - 'apps/desktop/**/*.{ts,tsx}'
    - 'apps/browser/**/*.{ts,tsx}'
---

# `@safely/web-ui` — components and styling

The React layer shared by every web target (`apps/desktop`, later `apps/browser`). It holds the
design system, the screens built from it and the flows that drive them over `@safely/ux`, and
nothing else — no router, no route components, no platform-bound controller hooks: it must stay free
of platform code the same way `@safely/ux` stays free of React Native, and free of platform
_contracts_ too — those belong to the apps. Layers: see `fsd-layers.md`.

Stack: `@base-ui/react` (headless components) + `@pandacss/dev` (zero-runtime styling) on top of
`@safely/ux` for all screen logic. Zero-runtime matters beyond bundle size: the MV3 extension's CSP
forbids injecting styles at runtime.

## Panda needs codegen before anything else

`styled-system/` is generated (`panda codegen`) and gitignored. Without it the generated types are
empty, so `compile`, `lint` and `test` all run codegen first — that is why the scripts look the way
they do, and why `pnpm -r run` (topological) is the way to build the apps that depend on this
package.

There is exactly **one** Panda instance in the monorepo: `packages/web-ui/panda.config.ts`. Its
`include` covers the apps as well, and `importMap` makes the generated helpers importable everywhere
as `@safely/web-ui/styled-system/*`. Apps only point their `postcss.config.cjs` at that config —
never add a second one.

`include` globs are resolved against `cwd`, which is the **app** directory when the app's PostCSS
run loads this config — so the config pins `cwd: __dirname`. Without it both globs resolve into the
app, this package's sources are never extracted, and every atomic `css()` written here ships no CSS
while recipes keep working through `staticCss` — a page renders with correct class names and no
layout.

Run lint through the package scripts (`pnpm --filter <pkg> run lint`, which is also what CI does).
`@pandacss/eslint-plugin` resolves included files relative to the working directory, so invoking
`eslint` from the repo root reports spurious `file-not-included` errors for app files.

## Tokens come from `@safely/ux/theme`, always

`panda/tokens.ts` reshapes those objects into Panda tokens; it never restates a value. A colour or a
spacing literal written anywhere else is a defect — `@pandacss/no-hardcoded-color` is an error, and
values must stay in sync with the mobile app, which reads the same objects.

The one exception is the stacking order: `zIndex` tokens (`loader`, `passcodePrompt`, `toast`) are
declared in `panda.config.ts`, because layering is a web-only problem the mobile theme has no answer
for. Anything that paints over the app takes its value from there — a raw number in a component is
how two overlays end up fighting. Modals need no token: they portal to the end of the body, so every
listed layer already covers them.

That last sentence holds only because `appLayout`'s `root` slot sets `isolation: isolate`. Without
it a raw `z-index` _inside_ the shell — the title bar, the sticky main-page header — outranks a
portalled `position: fixed` overlay that carries no `z-index` of its own, and the modal backdrop
then paints _under_ it: the dialog opens and that one element stays sharp while the rest blurs. The
isolation keeps the shell one stacking context, so the viewports rendered outside it
(`ToastViewport`, `LoaderViewport`, the passcode prompt) and the Base UI portals stay above the
whole app. A local `z-index` is therefore fine inside the shell, and must stay inside it.

Only a dark palette exists. When a light one appears, the mapper starts emitting `{ base, _dark }`
values and components stay untouched: token paths don't change.

## Panda drops dynamic values silently

Recipe variants are extracted the same way: a value never written literally in the source ships no
CSS, so `variant={props.variant}` renders an unstyled element with no error anywhere. The recipes of
this package are therefore listed in `staticCss` so every variant value is emitted — add a new
recipe to that list when you add one. Slot recipes go into `theme.extend.slotRecipes`, but
`staticCss.recipes` covers both kinds. A recipe key becomes a generated `export const`, so it must
be a valid identifier: the switch's recipe is keyed `toggle` (`export const switch` does not parse)
while its class name stays `switch`.

No build error, no style — just missing CSS. `css({ color: someVariable })`, `colorByType[type]`,
`<Box p={spacing}>` all extract to nothing. `@pandacss/no-dynamic-styling` is an error for this
reason. For genuinely dynamic values (a percentage, a user-chosen colour) set an inline CSS variable
and read it from a static style: `style={{ '--fill': value }}` plus `width: 'var(--fill)'`.

## Screens are composed from `shared/ui`

Pages, features and entities are assembled from the primitives in `src/shared/ui` — `List`, `Cell`,
`Text`, `Button`, `Icon`, `Skeleton`, `EmptyState` and the rest. A raw `div`/`section`/`h2` plus a
local `css()` covers only what no primitive owns: container padding, a scroll sentinel, positioning.

A local style that restates a recipe slot is a defect, not a shortcut: the copy stops matching the
recipe at the first design change, and nothing in lint or CI compares them. When the design needs a
look the primitive lacks, the variant goes into the recipe (`panda/recipes/*.recipe.ts` — and into
`staticCss` if the recipe is new), or a new primitive goes into `shared/ui`. The history list is the
worked example: date headings are `List.Title variant="heading"`, rows sit in
`List.Group variant="separated"` — which is also what gives each row its corner radius, so the row
itself carries none — and the loading state is `Skeleton`, not five copies of one pulsing bar.

The shell has two side regions, each a pair of slots: `AppLayout.Secondary`/`SecondaryContent` on
the left holds settings, `AppLayout.Panel`/`PanelContent` on the right holds a detail view. Both
open by collapsing the outer slot's width while the inner one slides, so the outer slot stays
mounted and the page decides what the inner one contains — the transaction panel is a sibling of
`AppLayout.Content`, which is why the selected activity lives in `MainPage` and reaches the list as
a prop rather than being opened by it.

## Base UI conventions

- Component state is exposed as **data attributes**; style them through the conditions declared in
  `panda.config.ts` (`_open`, `_highlighted`, `_selected`, `_enter`, `_exit`).
- `className` and `style` also accept a **function of state** — never use that form: Panda cannot
  extract it. Components in `shared/ui` narrow `className` to `string` to make this a type error.
- Pass a recipe class name to a Base UI part; do not wrap parts in `styled()`. Without
  `shouldForwardProp` a wrapper leaks style props into the DOM.
- Multipart components (`Root / Trigger / Positioner / Popup / Item`) map slot-for-slot onto a
  `defineSlotRecipe`. Element composition uses the `render` prop, not `asChild`.
- Recipes live in `packages/web-ui/panda/recipes/*.recipe.ts`, outside `src`: `defineRecipe` is a
  config-time function and calling it from source is an eslint error
  (`@pandacss/no-config-function-in-source`).
- `@floating-ui` inside Base UI sets inline `style` for positioning, so a CSP must allow
  `style-src 'unsafe-inline'`; Base UI ships `./csp-provider` for nonce-based setups.

## Routing lives in the app, not here

A page takes props and renders, and knows nothing about routes, guards or navigation. The route
tree, the guards and the route components that mount them live in the app
(`apps/desktop/src/renderer/app`, on TanStack Router over a memory history), so a second target can
wire the same screens into its own navigation. A component here that reaches for `useNavigate` has
to take a callback prop instead.

**The page owns the shape of its location, the app owns the URL.** `MainPage` is controlled: it
takes a `MainLocation` (`pages/main/location.ts` — the view, the settings section, and which
top-level modal is open) plus `onNavigate(next)`, and never holds that state itself. The app's route
component translates its matched route into a `MainLocation` and a `MainLocation` back into a
`navigate()` call (`apps/desktop/src/renderer/screens/main-location.ts`), so a deep link is one
`router.navigate` away. A flow whose opening is part of the location (`useSendFlow`,
`useReceiveFlow`, `useAddWalletFlow`, the `add` half of `useAccountFlow`) takes
`{ isOpen, onOpenChange }` (`shared/hooks/useControlledOpen`) and resets its inner steps when it is
closed from outside. The steps _inside_ a flow stay local state: they follow async results
(`resolveImportedPortfolio` deciding between `duplicate` and `customize`) and sit next to secrets in
refs, so a URL cannot own them.

**A flow may live here; a platform-bound one may not.** The slices in
`features/{add-wallet,wallet,account,contact,sync}` hold the controller hooks and the modal switches
that drive a scenario — local step state, `@safely/ux` mutations, and the modals of their own slice.
What a flow here must **not** hold is a decision mobile takes too: which copy a destructive sheet
shows, what sign-out deletes versus erases, whether an address is already watched, or the order of
unlock-then-write. Those live in `@safely/ux` (`resolveRemoveWalletCopy`, `resolveSignOutPlan`,
`resolveWatchOnlyPortfolio`, `useAddPortfolioFromSource`, `useCreateAccountFromSource` — see
`fsd-layers.md`), and a flow here composes them; what stays is the step state, the modal switch and
where a success goes. That is shareable because both web targets render the same overlays, while
mobile navigates instead. The line is what a flow binds to: nothing but `@safely/ux` contracts and
this package's own components, and it is shared; a route, an app storage layer or a decision only
one target can answer, and it stays in the app. `apps/desktop/src/renderer/features/onboarding` is
the flow that stays: it navigates when the account is created, sets the passcode through the desktop
storage layer, and unlocks with `UNSAFE_SKIP_SECURITY_CHECK_unlock()`, which the extension — with no
keychain — cannot mean the same thing by.

**A flow lives where it is triggered, with its modal switch next to it.** `WalletSettings` calls
`useWalletFlow()` and renders `<WalletModals />` itself; `AddressBookSettings` does the same with
`useAddressBookFlow()`. It moves up to the page only when more than one child triggers it, because a
hook called twice is two independent states: `MainPage` keeps `useAddWalletFlow` (the wallet sidebar
and the empty state both open it) and `useAccountFlow` (the settings sidebar edits, adds and signs
out; the account list adds), renders those two switches, and passes the flow object down as a single
prop — no page-level context and no bag of callbacks in between. What only the app can answer does
not travel through the page as state either: `MainPage` takes the `security` section as a
`ReactNode` the app mounts with its own props, and the `logs` node the same way (`LogsSection` over
the app's `ILogFileStore`). The dev tools are an ordinary settings section (`devTools`), only
reached by a long press on the version line instead of a sidebar cell; its tools (`DEV_TOOLS`) are a
second level of the same view state, `MainView.settings.tool`, never local component state.

A flow that must ignore a cancelled security gate catches `SecurityCheckCancelledError` from
`@safely/ux`; which factors the gate composes and how it is raised stays the app's
(`desktop-app.md`).

**A secret never travels through navigation.** Navigating with state writes into a history entry: it
outlives the step, comes back on a backwards navigation, and is readable by whatever renders on that
path. A mnemonic, a passcode or a private key therefore stays inside the component that collects it
(multi-step input is one screen with an internal step, the way `PasscodeSetup` works on mobile), or
is handed on by reference as a disposable resource (`MnemonicResource` + `Symbol.dispose`). Route
state carries the intent only — `{ kind: 'imported' }`, never the phrase itself.

## No platform contract lives here

This package supplies parts — `WebLinking`, the toast service, the logger and i18next factories, the
design system — and the **app** decides what a platform is. `apps/desktop/src/renderer/platform/`
declares its own `DesktopPlatform` and assembles `IAppContext` from it in `app/AppProviders.tsx`,
mirroring `apps/mobile/src/app`; the extension will describe itself with its own shape, which
differs in storage, in user presence and in how links open.

Stubs for capabilities a target lacks are the app's too
(`apps/desktop/src/renderer/platform/unsupported.ts`): what is missing differs per target, and a
shared "unsupported" list would quietly define the extension's gaps as well. Desktop currently stubs
Ledger only; the secret storage is real (`.claude/rules/desktop-secret-store.md`) and so is the gate
around it — passcode plus Touch ID, implemented in `apps/desktop/src/renderer/features/`. QR
scanning is split the same way: the three modals live in `src/features/qr-scan` here, everything
that decides — the OS permission, the device list, the remembered source — in the app
(`.claude/rules/desktop-qr.md`).

**The security module is the app's, and the screens are this package's.** `pages/passcode`,
`pages/lock` and `pages/main/settings/SecuritySettings` take props and render: a value, a length, an
`isInvalid`, an optional `biometry` key for the keypad, callbacks out. Everything behind them —
where the passcode is stored, the lockout schedule, the prompt store that turns
`IAppContext.security.check()` into a screen, the biometry query — lives in the app
(`.claude/rules/desktop-app.md`), because each web target answers those differently. A flow here may
_react_ to that gate — `SecurityCheckCancelledError` is a `@safely/ux` export — but never raises it.
A hook here that reads `useAppContext().storage` to decide a key name, or a `PasscodeStorage`-shaped
type declared here for an app to implement, is the specific regression that split undid.

A type that describes _what an app must provide_ therefore does not belong here, and neither does
anything a component only needs because some target happens to work that way. What a shared
component needs, it takes as a prop.

## This package owns no environment

Nothing here reaches the runtime: components, hooks, flows, formatting, `WebLinking`, the logger and
i18next factories, the platform types. Anything that touches it — installing globals, polyfills,
build configuration — belongs to the app, because the two web targets do not share a runtime (an
Electron renderer and an MV3 page differ in CSP, in available APIs and in how they are bundled), and
a package that reaches for the environment forces both of them into one shape.

Concretely, and deliberately absent: there is **no `./bootstrap` entry and no `globals.ts`** — the
globals the domain packages read (`Buffer`, `IsomorphicEventSource`, `safelyCrypto.pbkdf2Sha512`)
are installed by `../../apps/desktop/src/renderer/global-polyfills.ts`, the web counterpart of
`apps/mobile/global-polyfills.ts`, and the extension will get its own copy. There is also **no
shared Vite preset**: each app writes its own config (`apps/desktop/vite.renderer.config.ts`). If a
third web target ever repeats the same twenty lines, extract them then — a shared build config is
how environment assumptions creep back in.

## Build wiring

Styles reach an app through `@safely/web-ui/styles.css`, whose only content is the Panda layer
declaration; base styles live in `globalCss` in the config so they can use tokens.
