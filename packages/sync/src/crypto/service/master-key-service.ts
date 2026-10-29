import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { utf8 } from '../../utils/buffer';
import type { SecureEncryptedKeyRepository } from '../secure-encrypted-key-repository';

export enum MKDerivationDomain {
    ROOT_SEED_KEY = 'root-seed-key',
    ANALYTICS_ID = 'analytics-id',
    ACCOUNT_DATA_KEY = 'account-data-key'
}

export class MasterKeyService {
    constructor(private readonly keyRepository: SecureEncryptedKeyRepository) {}

    public async withMasterKey<T>(f: (masterKey: Buffer) => Promise<T> | T): Promise<T> {
        const masterKey = await this.keyRepository.getMasterKey();
        try {
            const res = await f(masterKey);
            masterKey.fill(0);
            return res;
        } catch (error) {
            masterKey.fill(0);
            throw error;
        }
    }

    public async deriveKey(domain: MKDerivationDomain): Promise<Buffer> {
        return await this.withMasterKey(async masterKey => {
            return Buffer.from(
                hkdf(
                    sha256,
                    masterKey,
                    undefined,
                    utf8(`safely/sync/v1/derived-from-master/${domain}`),
                    32
                )
            );
        });
    }
}
