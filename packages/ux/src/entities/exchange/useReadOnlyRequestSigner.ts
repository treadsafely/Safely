import { useMemo } from 'react';

import type { RequestSigner } from '@safely/core';
import { PortfolioType, ReadOnlyRequestSigner } from '@safely/core';

import { useAppContext, BaseSecureSecretEncryptor, useFlag } from '../../shared';
import { useActiveAccount } from '../account';
import { useActivePortfolio } from '../portfolio';
import { useReadOnlyCredentialCache } from './useReadOnlyCredentialCache';

export function useReadOnlyRequestSigner(): RequestSigner | undefined {
    const account = useActiveAccount();
    const portfolio = useActivePortfolio();
    const { storage } = useAppContext();
    const cache = useReadOnlyCredentialCache();
    const isOnrampsEnabled = useFlag('enable_onramps');

    const portfolioKey = portfolio.id.toString();

    return useMemo(() => {
        if (!isOnrampsEnabled) return undefined;
        if (portfolio.type !== PortfolioType.BIP39) return undefined;

        return new ReadOnlyRequestSigner(async () => {
            const cached = await cache.get(portfolio.id);
            if (cached) return cached;

            using secureStorage = storage.sync.getSecureEncrypted();
            // skips security check for UX reason. We use it to sign requests with read-only credentials.
            secureStorage.UNSAFE_SKIP_SECURITY_CHECK_unlock();
            const encryptor = new BaseSecureSecretEncryptor(account.secretEncryptor, secureStorage);
            const credential = await portfolio.createReadOnlyCredential(encryptor);

            await cache.set(portfolio.id, credential).catch(() => undefined);

            return credential;
        });
    }, [isOnrampsEnabled, portfolioKey, account.secretEncryptor, storage, cache]);
}
