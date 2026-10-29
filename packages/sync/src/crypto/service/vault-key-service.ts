import { SymmetricCipher } from './symmetric-cipher';
import type { SecureEncryptedKeyRepository } from '../secure-encrypted-key-repository';

export class VaultKeyService {
    private readonly cipher: SymmetricCipher;

    constructor(keyRepository: SecureEncryptedKeyRepository) {
        this.cipher = new SymmetricCipher(() => keyRepository.getVaultKey());
    }

    public encrypt(data: Buffer): Promise<{ ciphertext: Buffer; nonce: Buffer }> {
        return this.cipher.encrypt(data);
    }

    public decrypt(ciphertext: Buffer, nonce: Buffer): Promise<Buffer> {
        return this.cipher.decrypt(ciphertext, nonce);
    }
}
