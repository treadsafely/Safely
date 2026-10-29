import { useCallback } from 'react';

import { useAppContext, UnlockableSecureSecretEncryptor } from '../../shared';
import { useActiveAccount } from '../account';

export function useUnlockableSecureSecretEncryptorFactory() {
    const account = useActiveAccount();
    const { storage } = useAppContext();

    return useCallback(
        () =>
            new UnlockableSecureSecretEncryptor(
                account.secretEncryptor,
                storage.sync.getSecureEncrypted
            ),
        [account.secretEncryptor, storage.sync.getSecureEncrypted]
    );
}
