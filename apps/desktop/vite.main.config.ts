import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const STUB_ID = '\0safely:secret-backend-stub';
const LOGGER = JSON.stringify(path.resolve(__dirname, 'src/main/logger'));
const JSON_STORE = JSON.stringify(path.resolve(__dirname, 'src/main/store/json-store'));

/* The development secret backend: the shape of `SecretBackend` and none of the protection — plain
   files in the development `userData`, because an unsigned build has no entitlement, no access
   group and no Hello credential of its own. A string rather than a module on purpose: nothing in
   `src/` can import it, and only the plugin below makes the specifier resolvable at all. Not type
   checked — a member added to `SecretBackend` has to be added here by hand. */
const STUB_SOURCE = `
import { systemPreferences } from 'electron';
import path from 'node:path';

import { JsonStore } from ${JSON_STORE};
import { mainLogger } from ${LOGGER};

mainLogger.warn('The secret store is running on the development stub — nothing is protected');

const canPromptTouchID = () => process.platform === 'darwin' && systemPreferences.canPromptTouchID();

export function createSecretBackend(directory) {
    const encrypted = new JsonStore(path.join(directory, 'dev-keychain-encrypted.json'));
    const secureEncrypted = new JsonStore(path.join(directory, 'dev-keychain-secureEncrypted.json'));

    return {
        encrypted,
        secureEncrypted,
        unlock: () => Promise.resolve({ state: 'unlocked', isPresenceVerified: false }),
        erase: () => Promise.all([encrypted.clear(), secureEncrypted.clear()]).then(() => undefined),
        isPresenceCheckAvailable: () => Promise.resolve(canPromptTouchID()),
        verifyPresence: async (_windowHandle, reason) => {
            if (!canPromptTouchID()) {
                return false;
            }

            try {
                await systemPreferences.promptTouchID(reason);

                return true;
            } catch (error) {
                mainLogger.info('Touch ID was not satisfied', error);

                return false;
            }
        }
    };
}
`;

function devStubSecretBackendPlugin(): Plugin {
    return {
        name: 'safely:secret-backend-stub',
        enforce: 'pre',
        resolveId: source => (/(^|\/)secret-backend$/.test(source) ? STUB_ID : null),
        load: id => (id === STUB_ID ? STUB_SOURCE : null)
    };
}

/* electron-forge supplies the CJS lib build, the electron externals and the `MAIN_WINDOW_VITE_*`
   defines. The stub is opt-in on `serve` — forge passes `build` for `package`/`make`, so anything
   unexpected resolves to the addon rather than to the stub, and an import of the stub in a
   packaged build fails the build instead of shipping. */
export default defineConfig(({ command }) => ({
    define: { SAFELY_BUILD_NUMBER: JSON.stringify(process.env.SAFELY_BUILD_NUMBER ?? null) },
    esbuild: { keepNames: true },
    plugins: command === 'serve' ? [devStubSecretBackendPlugin()] : []
}));
