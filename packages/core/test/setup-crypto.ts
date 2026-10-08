import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha512 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

// The test harness is an "app": it installs its own `safelyCrypto` provider
// (pure-JS noble) so domain tests that derive seeds have a working primitive.
globalThis.safelyCrypto = {
    pbkdf2Sha512: (password, salt, iterations, keyLength) =>
        pbkdf2Async(sha512, password, salt, { c: iterations, dkLen: keyLength })
};

// Testnet portfolios derive a Flame view key on creation; the native SDK is not on the host.
globalThis.flameSdk = {
    viewKey: (seed, network) => Promise.resolve(`${network}view1${bytesToHex(seed.slice(0, 8))}`),
    address: (viewKey, network, path) =>
        Promise.resolve({
            address: `${viewKey}/${network}/${path.branch}/${path.index}`,
            predicate: new Uint8Array(32)
        }),
    decodeContracts: () =>
        Promise.reject(new Error('flameSdk.decodeContracts is not available in tests')),
    openNotes: () => Promise.reject(new Error('flameSdk.openNotes is not available in tests'))
};
