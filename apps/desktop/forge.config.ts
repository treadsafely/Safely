import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { MakerZIP } from '@electron-forge/maker-zip';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { VitePlugin } from '@electron-forge/plugin-vite';
import type { ForgeConfig } from '@electron-forge/shared-types';

/* Build-time environment, all optional — see `.claude/rules/desktop-signing.md`:
     SAFELY_SIGN_IDENTITY   codesigning identity; naming one is what turns signing on
     SAFELY_SIGN_PROFILE    provisioning profile to embed, required alongside the identity
     SAFELY_SIGN_KEYCHAIN   keychain to look the identity up in; unset means the default search list
     SAFELY_BUILD_NUMBER    CI's build counter; becomes CFBundleVersion, which the About panel shows */
const identity = process.env.SAFELY_SIGN_IDENTITY;
const provisioningProfile = process.env.SAFELY_SIGN_PROFILE;
const buildVersion = process.env.SAFELY_BUILD_NUMBER;

/* An unsigned build has to keep working, because the profiles are uncommitted and per machine.
   Half-configured signing must not: without the profile the entitlements are validated against, the
   app is signed and still reaches no access group. Signing is what makes the store exist at all. */
if (Boolean(identity) !== Boolean(provisioningProfile)) {
    throw new Error('SAFELY_SIGN_IDENTITY and SAFELY_SIGN_PROFILE are set together or not at all');
}

const signing = identity
    ? {
          osxSign: {
              identity,
              provisioningProfile,
              keychain: process.env.SAFELY_SIGN_KEYCHAIN,
              /* forge packages with `quiet: true`, so the default discards the signing error and ships an unsigned app. */
              continueOnError: false,
              optionsForFile: (filePath: string) => ({
                  hardenedRuntime: true,
                  /* Only the main binary may reach the keychain group; helpers host the renderer. */
                  entitlements: filePath.includes('Helper')
                      ? 'signing/entitlements.helper.plist'
                      : 'signing/entitlements.plist'
              })
          }
      }
    : {};

const config: ForgeConfig = {
    packagerConfig: {
        asar: true,
        /* `dlopen` needs a real file, and `Contents/Resources` keeps it out of the asar without
           relying on unpack globs, which do not match the dot-directory the bundle lives in. */
        extraResource: ['native/keychain/build/Release/keychain.node'],
        appBundleId: 'com.safely.wallet-desktop',
        buildVersion,
        /* Electron's own plist carries a generic one, which is what the macOS prompt would show. */
        usageDescription: { Camera: 'Safely uses the camera to scan QR codes.' },
        /* Chromium reads this in the process that captures — a helper — and without it an iPhone
           arrives as a deprecated `AVCaptureDeviceTypeExternal` device. */
        extendInfo: { NSCameraUseContinuityCameraDeviceType: true },
        extendHelperInfo: { NSCameraUseContinuityCameraDeviceType: true },
        ...signing
    },
    /* Off: the addon is N-API, so the Node-built binary loads in Electron unchanged — verified, not
       assumed — and `build:native` is the only thing that builds it. An empty `onlyModules` matches
       no module, which is how @electron/rebuild is switched off. */
    rebuildConfig: { onlyModules: [] },
    /* macOS is the only target for now — the secret store relies on macOS-only guarantees
       (`.claude/rules/desktop-secret-store.md`), so a Windows build would ship a store it cannot
       protect. dmg arrives with the signing and notarisation milestone. */
    makers: [new MakerZIP({}, ['darwin'])],
    plugins: [
        new VitePlugin({
            /* Object entries: the output file name is the entry key, and main and preload share
               `.vite/build/` — two entries named `index` would overwrite each other. */
            build: [
                {
                    entry: { main: 'src/main/index.ts' },
                    config: 'vite.main.config.ts',
                    target: 'main'
                },
                {
                    entry: { preload: 'src/preload/index.ts' },
                    config: 'vite.preload.config.ts',
                    target: 'preload'
                }
            ],
            renderer: [
                {
                    name: 'main_window',
                    config: 'vite.renderer.config.ts'
                }
            ]
        }),
        /* No node inside the app, no debugging entry points, asar contents integrity-checked. */
        new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: true,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true
        })
    ]
};

export default config;
