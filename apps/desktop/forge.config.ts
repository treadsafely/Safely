import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { MakerPKG } from '@electron-forge/maker-pkg';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { VitePlugin } from '@electron-forge/plugin-vite';
import type { ForgeConfig, ForgePlatform } from '@electron-forge/shared-types';

/* Build-time environment, all optional — see `.claude/rules/desktop-signing.md`:
     SAFELY_SIGN_IDENTITY   codesigning identity; naming one is what turns signing on
     SAFELY_SIGN_PROFILE    provisioning profile to embed, required alongside the identity
     SAFELY_SIGN_KEYCHAIN   keychain to look the identity up in; unset means the default search list
     SAFELY_INSTALLER_IDENTITY  Mac Installer Distribution identity that signs the `.pkg` `make:mas` uploads
     SAFELY_BUILD_NUMBER    CI's build counter; becomes CFBundleVersion, which the About panel shows */
const identity = process.env.SAFELY_SIGN_IDENTITY;
const provisioningProfile = process.env.SAFELY_SIGN_PROFILE;
const keychain = process.env.SAFELY_SIGN_KEYCHAIN;
const buildVersion = process.env.SAFELY_BUILD_NUMBER;
const teamId = '3ZVCUSJU6R';
const supportedPlatforms: ForgePlatform[] = ['mas'];

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
              keychain,
              /* forge packages with `quiet: true`, so the default discards the signing error and ships an unsigned app. */
              continueOnError: false,
              optionsForFile: (filePath: string) => {
                  const nested = filePath.includes('.app/');

                  return {
                      /* An inheriting helper cannot carry `allow-jit`, and under the runtime V8 then cannot reserve its JIT region. */
                      hardenedRuntime: !nested,
                      /* Only the top-level bundle may reach the keychain group; everything nested only inherits its sandbox. */
                      entitlements: nested
                          ? 'signing/entitlements.helper.plist'
                          : 'signing/entitlements.plist'
                  };
              }
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
        appCategoryType: 'public.app-category.finance',
        /* `CFBundleURLTypes`: what makes macOS hand a `safely://` link to the app. The scheme is
           `APP_SCHEME` in `src/main/app-protocol.ts`. */
        protocols: [{ name: 'Safely', schemes: ['safely'] }],
        icon: 'assets/icon',
        buildVersion,
        /* Electron's own plist carries a generic one, which is what the macOS prompt would show. */
        usageDescription: { Camera: 'Safely uses the camera to scan QR codes.' },
        /* Chromium reads this in the process that captures — a helper — and without it an iPhone
           arrives as a deprecated `AVCaptureDeviceTypeExternal` device. */
        extendInfo: {
            NSCameraUseContinuityCameraDeviceType: true,
            /* A MAS Electron derives its application group from this; it must match the entitlements. */
            ElectronTeamID: teamId,
            ITSAppUsesNonExemptEncryption: false
        },
        extendHelperInfo: { NSCameraUseContinuityCameraDeviceType: true },
        ...signing
    },
    /* Off: the addon is N-API, so the Node-built binary loads in Electron unchanged — verified, not
       assumed — and `build:native` is the only thing that builds it. An empty `onlyModules` matches
       no module, which is how @electron/rebuild is switched off. */
    rebuildConfig: { onlyModules: [] },
    makers: [new MakerPKG({ identity: process.env.SAFELY_INSTALLER_IDENTITY, keychain }, ['mas'])],
    hooks: {
        /* forge falls back to the host platform, and a darwin package would still be signed with the sandbox entitlements. */
        prePackage: async (_config, platform) => {
            if (!supportedPlatforms.includes(platform)) {
                throw new Error(
                    `Cannot package for '${platform}': supported targets are ${supportedPlatforms.join(', ')} — use the package:<target> script`
                );
            }
        }
    },
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
