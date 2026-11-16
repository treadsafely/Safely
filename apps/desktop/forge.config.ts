import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { MakerMSIX } from '@electron-forge/maker-msix';
import { MakerPKG } from '@electron-forge/maker-pkg';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { VitePlugin } from '@electron-forge/plugin-vite';
import type { ForgeConfig, ForgePlatform } from '@electron-forge/shared-types';
import fs from 'node:fs';
import path from 'node:path';

/* Build-time environment, all optional — see `.claude/rules/desktop-signing.md`:
     SAFELY_SIGN_IDENTITY   codesigning identity; naming one is what turns signing on
     SAFELY_SIGN_PROFILE    provisioning profile to embed, required alongside the identity
     SAFELY_SIGN_KEYCHAIN   keychain to look the identity up in; unset means the default search list
     SAFELY_INSTALLER_IDENTITY  Mac Installer Distribution identity that signs the `.pkg` `make:mas` uploads
     SAFELY_BUILD_NUMBER    CI's build counter; becomes CFBundleVersion, which the About panel shows
   and for the Windows package — see `.claude/rules/desktop-secret-store-windows.md`:
     SAFELY_MSIX_IDENTITY_NAME, SAFELY_MSIX_PUBLISHER, SAFELY_MSIX_PUBLISHER_DISPLAY_NAME
                            the Partner Center identity; development defaults otherwise
     SAFELY_MSIX_UNSIGNED   `true` skips the development certificate — the Store signs its own copy */
const identity = process.env.SAFELY_SIGN_IDENTITY;
const provisioningProfile = process.env.SAFELY_SIGN_PROFILE;
const keychain = process.env.SAFELY_SIGN_KEYCHAIN;
const buildVersion = process.env.SAFELY_BUILD_NUMBER;
const teamId = '3ZVCUSJU6R';

/* The config is evaluated before `--platform` is known and the native addon builds only on the
   host, so the host decides what can be packaged here; `prePackage` refuses anything else. */
const host = process.platform;
const supportedPlatforms: ForgePlatform[] = host === 'win32' ? ['win32'] : ['mas'];

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

const NATIVE_ADDON: Record<'mas' | 'win32', string> = {
    mas: 'native/keychain/build/Release/keychain.node',
    win32: 'native/hello/build/Release/hello.node'
};

const MANIFEST_TEMPLATE = path.join(__dirname, 'windows', 'AppxManifest.xml');
const RENDERED_MANIFEST = path.join(__dirname, 'out', 'windows', 'AppxManifest.xml');
const MSIX_ARCHITECTURE: Partial<Record<string, string>> = { x64: 'x64', arm64: 'arm64' };

/* CI hands an unset repository variable over as an empty string, which must not become an empty publisher */
const envOrDefault = (name: string, fallback: string): string => {
    const value = process.env[name];

    return value === undefined || value === '' ? fallback : value;
};

const msixIdentity = {
    name: envOrDefault('SAFELY_MSIX_IDENTITY_NAME', 'Safely.Development'),
    publisher: envOrDefault('SAFELY_MSIX_PUBLISHER', 'CN=Safely Development'),
    publisherDisplayName: envOrDefault('SAFELY_MSIX_PUBLISHER_DISPLAY_NAME', 'Safely Development')
};

const escapeXml = (value: string): string =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/* The manifest is a reviewed file with four blanks: the identity, the version and the architecture.
   The Store wants the fourth version number at zero and every submission strictly higher. */
function renderManifest(arch: string): void {
    const architecture = MSIX_ARCHITECTURE[arch];

    if (architecture === undefined) {
        throw new Error(`The MSIX manifest has no architecture for '${arch}'`);
    }

    const { version } = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')
    ) as { version: string };

    const rendered = fs
        .readFileSync(MANIFEST_TEMPLATE, 'utf8')
        .replace(/{{IDENTITY_NAME}}/g, escapeXml(msixIdentity.name))
        .replace(/{{PUBLISHER}}/g, escapeXml(msixIdentity.publisher))
        .replace(/{{PUBLISHER_DISPLAY_NAME}}/g, escapeXml(msixIdentity.publisherDisplayName))
        .replace(/{{VERSION}}/g, `${version}.0`)
        .replace(/{{ARCHITECTURE}}/g, architecture);

    fs.mkdirSync(path.dirname(RENDERED_MANIFEST), { recursive: true });
    fs.writeFileSync(RENDERED_MANIFEST, rendered);
}

let targetArch: string = process.arch;

const config: ForgeConfig = {
    packagerConfig: {
        asar: true,
        /* `dlopen` needs a real file, and `Contents/Resources` keeps it out of the asar without
           relying on unpack globs, which do not match the dot-directory the bundle lives in. */
        extraResource: [host === 'win32' ? NATIVE_ADDON.win32 : NATIVE_ADDON.mas],
        appBundleId: 'com.safely.wallet-desktop',
        appCategoryType: 'public.app-category.finance',
        /* `CFBundleURLTypes`: what makes macOS hand a `safely://` link to the app. Restates
           `APP_URL_SCHEME` from `@safely/ux` — a forge config cannot import the package. The MSIX
           manifest declares the same scheme for Windows. */
        protocols: [{ name: 'Safely', schemes: ['safely'] }],
        /* `assets/icon.icns` on macOS, `assets/icon.ico` on Windows */
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
        win32metadata: {
            CompanyName: 'Safely',
            ProductName: 'Safely',
            FileDescription: 'Safely'
        },
        ...signing
    },
    /* Off: the addon is N-API, so the Node-built binary loads in Electron unchanged — verified, not
       assumed — and `build:native:<target>` is the only thing that builds it. An empty `onlyModules`
       matches no module, which is how @electron/rebuild is switched off. */
    rebuildConfig: { onlyModules: [] },
    makers:
        host === 'win32'
            ? [
                  new MakerMSIX(
                      {
                          appManifest: RENDERED_MANIFEST,
                          packageAssets: path.join(__dirname, 'windows', 'assets'),
                          sign: process.env.SAFELY_MSIX_UNSIGNED !== 'true',
                          logLevel: 'warn'
                      },
                      ['win32']
                  )
              ]
            : [
                  new MakerPKG({ identity: process.env.SAFELY_INSTALLER_IDENTITY, keychain }, [
                      'mas'
                  ])
              ],
    hooks: {
        /* forge falls back to the host platform, and a darwin package would still be signed with the sandbox entitlements. */
        prePackage: async (_config, platform, arch) => {
            if (!supportedPlatforms.includes(platform)) {
                throw new Error(
                    `Cannot package for '${platform}' on ${host}: supported targets here are ${supportedPlatforms.join(', ')} — use the package:<target> script`
                );
            }

            targetArch = arch;
        },
        preMake: async () => {
            if (host === 'win32') {
                renderManifest(targetArch);
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
