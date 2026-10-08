import { utf8ToBytes } from '@noble/hashes/utils.js';

const BIP39_ITERATIONS = 2048;
const BIP39_KEY_LENGTH = 64;

const nfkdBytes = (str: string) => utf8ToBytes(str.normalize('NFKD'));

/**
 * BIP39 seed derivation; identical to @scure/bip39 `mnemonicToSeed`.
 */
export async function mnemonicToSeed(mnemonic: string): Promise<Uint8Array> {
    const password = nfkdBytes(mnemonic);
    const passphrase = '';
    const salt = nfkdBytes('mnemonic' + passphrase);

    try {
        return await globalThis.safelyCrypto.pbkdf2Sha512(
            password,
            salt,
            BIP39_ITERATIONS,
            BIP39_KEY_LENGTH
        );
    } finally {
        password.fill(0);
    }
}
