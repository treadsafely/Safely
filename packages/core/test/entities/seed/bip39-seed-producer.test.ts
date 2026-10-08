import { describe, it, expect, vi, afterEach } from 'vitest';

import type { IMnemonicVault } from '../../../src/entities/mnemonic';
import { BtcBip39SeedProducer } from '../../../src/entities/seed/bip39-seed-producer';

const MNEMONIC = 'abandon '.repeat(11).concat('about').split(' ');

// BIP39 test vector for the mnemonic above with an empty passphrase.
const EXPECTED_SEED =
    '5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc1' +
    '9a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4';

const vault: IMnemonicVault = { getMnemonic: () => Promise.resolve(MNEMONIC) };

// The mnemonic bytes and the raw PBKDF2 output never leave the seed pipeline, so
// the KDF boundary is the only place a test can get hold of them.
function trackKdfBuffers(): { passwords: Uint8Array[]; rawSeeds: Uint8Array[] } {
    const passwords: Uint8Array[] = [];
    const rawSeeds: Uint8Array[] = [];
    const pbkdf2Sha512 = globalThis.safelyCrypto.pbkdf2Sha512.bind(globalThis.safelyCrypto);

    vi.spyOn(globalThis.safelyCrypto, 'pbkdf2Sha512').mockImplementation(
        async (...args: Parameters<typeof pbkdf2Sha512>) => {
            passwords.push(args[0]);

            const rawSeed = await pbkdf2Sha512(...args);
            rawSeeds.push(rawSeed);

            return rawSeed;
        }
    );

    return { passwords, rawSeeds };
}

describe('BtcBip39SeedProducer', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('derives the BIP39 seed for the mnemonic', async () => {
        const seed = await new BtcBip39SeedProducer(vault).getSeed();

        expect(seed.toString('hex')).toEqual(EXPECTED_SEED);
    });

    it('zeroes the mnemonic bytes and the raw seed it copies from', async () => {
        const { passwords, rawSeeds } = trackKdfBuffers();

        const seed = await new BtcBip39SeedProducer(vault).getSeed();

        expect(passwords).toHaveLength(1);
        expect(rawSeeds).toHaveLength(1);
        expect(passwords[0].every(byte => byte === 0)).toBe(true);
        expect(rawSeeds[0].every(byte => byte === 0)).toBe(true);
        // The copy handed to the caller is untouched and owned by them.
        expect(seed.toString('hex')).toEqual(EXPECTED_SEED);
    });
});
