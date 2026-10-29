import { vi } from 'vitest';

import type {
    IMnemonic,
    IMnemonicAccessor,
    IMnemonicVault,
    ISecureSecretEncryptor,
    ISilentSecretEncryptor,
    SSecretDecrypted,
    SSecretEncrypted
} from '@safely/core';

export class MockSecureSecretEncryptor implements ISecureSecretEncryptor {
    public readonly kind = 'secure';

    public decrypt = vi
        .fn()
        .mockImplementation(async (s: SSecretEncrypted): Promise<SSecretDecrypted> => s);
    public encrypt = vi
        .fn()
        .mockImplementation(async (s: SSecretDecrypted): Promise<SSecretEncrypted> => s);
}

export class MockSilentSecretEncryptor implements ISilentSecretEncryptor {
    public readonly kind = 'silent';

    public decrypt = vi
        .fn()
        .mockImplementation(async (s: SSecretEncrypted): Promise<SSecretDecrypted> => s);
    public encrypt = vi
        .fn()
        .mockImplementation(async (s: SSecretDecrypted): Promise<SSecretEncrypted> => s);
}

export class ClosableMnemonicAccessorVault implements IMnemonicAccessor, IMnemonicVault {
    constructor(public readonly value: string[]) {}

    public async getMnemonic(): Promise<IMnemonic> {
        return this.value;
    }
}
