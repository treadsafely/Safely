export {
    type SSecretDecrypted,
    type SSecretEncrypted,
    sSecretDecrypted,
    sSecretEncrypted
} from '@safely/sync';

import type { SSecretDecrypted, SSecretEncrypted } from '@safely/sync';

export interface ISecretEncryptor {
    encrypt(decryptedSecret: SSecretDecrypted): Promise<SSecretEncrypted>;
    decrypt(encryptedSecret: SSecretEncrypted): Promise<SSecretDecrypted>;
}

// behind VaultKey: decrypting may raise the passcode prompt; for secrets that can move funds
export interface ISecureSecretEncryptor extends ISecretEncryptor {
    readonly kind: 'secure';
}

// behind the account data key: never prompts, so never for anything that can move funds
export interface ISilentSecretEncryptor extends ISecretEncryptor {
    readonly kind: 'silent';
}
