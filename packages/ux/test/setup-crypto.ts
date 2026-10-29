import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha512 } from '@noble/hashes/sha2.js';

// The test harness is an "app": it installs its own `safelyCrypto` provider
// (pure-JS noble) so domain tests that derive seeds have a working primitive.
globalThis.safelyCrypto = {
    pbkdf2Sha512: (password, salt, iterations, keyLength) =>
        pbkdf2Async(sha512, password, salt, { c: iterations, dkLen: keyLength })
};

// The native Flame SDK is not on the host: a receiving address is told apart by its two HRP parts only.
const FLAME_RECEIVING_HRPS = { mainnet: ['f1', 'e1'], testnet: ['t1', 'i1'] } as const;

globalThis.flameSdk = {
    viewKey: () => Promise.reject(new Error('flameSdk.viewKey is not available in tests')),
    address: () => Promise.reject(new Error('flameSdk.address is not available in tests')),
    decodeContracts: () =>
        Promise.reject(new Error('flameSdk.decodeContracts is not available in tests')),
    openNotes: () => Promise.reject(new Error('flameSdk.openNotes is not available in tests')),
    buildTransfer: () =>
        Promise.reject(new Error('flameSdk.buildTransfer is not available in tests')),
    validateReceivingAddress: (address, network) => {
        const [tracking, encryption] = FLAME_RECEIVING_HRPS[network];
        return address.startsWith(tracking) && address.indexOf(encryption) > tracking.length;
    },
    memoMaxBytes: () => 8102
};
