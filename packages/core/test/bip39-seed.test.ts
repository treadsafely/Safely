import { bytesToHex } from '@noble/hashes/utils.js';
import { mnemonicToSeed as scureMnemonicToSeed } from '@scure/bip39';
import { describe, expect, it, vi } from 'vitest';

import type { SafelyCrypto } from '@safely/sync';

import { mnemonicToSeed } from '../src/entities/seed/bip39-seed';

// Real BIP39 mnemonics (Trezor test vectors): 12, 18 and 24 words.
const REAL_MNEMONICS = [
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    'legal winner thank year wave sausage worth useful legal winner thank yellow',
    'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong',
    'legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth useful legal will',
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'
] as const;

describe('mnemonicToSeed', () => {
    it('matches @scure/bip39 (noble) mnemonicToSeed on real mnemonics', async () => {
        for (const mnemonic of REAL_MNEMONICS) {
            const actual = await mnemonicToSeed(mnemonic);
            const expected = await scureMnemonicToSeed(mnemonic);
            expect(bytesToHex(actual)).toBe(bytesToHex(expected));
        }
    });

    it('applies BIP39 framing and delegates to globalThis.safelyCrypto.pbkdf2Sha512', async () => {
        const expected = new Uint8Array(64).fill(7);
        // The password bytes are zeroed once the KDF resolves, so snapshot them
        // while the call is still in flight rather than reading the retained arg.
        let passwordText: string | undefined;
        const spy = vi.fn<SafelyCrypto['pbkdf2Sha512']>().mockImplementation(password => {
            passwordText = Buffer.from(password).toString('utf8');
            return Promise.resolve(expected);
        });
        const previous = globalThis.safelyCrypto;
        globalThis.safelyCrypto = { pbkdf2Sha512: spy };

        try {
            const seed = await mnemonicToSeed('abandon about');

            expect(seed).toBe(expected);
            expect(spy).toHaveBeenCalledTimes(1);
            const [password, salt, iterations, keyLength] = spy.mock.calls[0];
            expect(passwordText).toBe('abandon about');
            expect(Buffer.from(salt).toString('utf8')).toBe('mnemonic');
            expect(iterations).toBe(2048);
            expect(keyLength).toBe(64);
            expect(password.every(byte => byte === 0)).toBe(true);
        } finally {
            globalThis.safelyCrypto = previous;
        }
    });
});
