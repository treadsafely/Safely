import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const STUB_ID = '\0safely:keychain-stub';
const LOGGER = JSON.stringify(path.resolve(__dirname, 'src/main/logger'));
const JSON_STORE = JSON.stringify(path.resolve(__dirname, 'src/main/store/json-store'));

/* The development keychain: the shape of `Keychain` and none of the protection — plain files in the
   development `userData`, because an unsigned build has no entitlement and no access group. A string
   rather than a module on purpose: nothing in `src/` can import it, and only the plugin below makes
   the specifier resolvable at all. Not type checked — a member added to `Keychain` has to be added
   here by hand. */
const STUB_SOURCE = `
import { app } from 'electron';
import path from 'node:path';

import { JsonStore } from ${JSON_STORE};
import { mainLogger } from ${LOGGER};

const stores = new Map();

const storeFor = service => {
    const existing = stores.get(service);

    if (existing) {
        return existing;
    }

    const name = service.split('.').pop();
    const store = new JsonStore(
        path.join(app.getPath('userData'), 'store', \`dev-keychain-\${name}.json\`)
    );

    stores.set(service, store);

    return store;
};

mainLogger.warn('The secret store is running on the development stub — nothing is protected');

export const keychain = {
    isAvailable: () => true,

    get: async (service, account) => {
        const value = await storeFor(service).get(account);

        return value === null ? null : Buffer.from(value, 'utf8');
    },

    set: (service, account, value) => storeFor(service).set(account, value),

    remove: (service, account) => storeFor(service).remove(account),

    keys: service => storeFor(service).keys(''),

    clear: service => storeFor(service).clear()
};
`;

function devStubKeychainPlugin(): Plugin {
    return {
        name: 'safely:keychain-stub',
        enforce: 'pre',
        resolveId: source => (/(^|\/)keychain-addon$/.test(source) ? STUB_ID : null),
        load: id => (id === STUB_ID ? STUB_SOURCE : null)
    };
}

/* electron-forge supplies the CJS lib build, the electron externals and the `MAIN_WINDOW_VITE_*`
   defines. The stub is opt-in on `serve` — forge passes `build` for `package`/`make`, so anything
   unexpected resolves to the addon rather than to the stub, and an import of the stub in a
   packaged build fails the build instead of shipping. */
export default defineConfig(({ command }) => ({
    define: { SAFELY_BUILD_NUMBER: JSON.stringify(process.env.SAFELY_BUILD_NUMBER ?? null) },
    plugins: command === 'serve' ? [devStubKeychainPlugin()] : []
}));
