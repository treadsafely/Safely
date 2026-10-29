import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { IMnemonicAccessor, Portfolio, PortfolioMeta, MnemonicResource } from '@safely/core';
import {
    PortfolioFlameDevnet,
    PortfolioIdBip39Imported,
    PortfolioIdFlameDevnet
} from '@safely/core';

import {
    portfolioKeys,
    useImportFlameDevnetPortfolio,
    usePortfolios,
    useUnlockableSecureSecretEncryptorFactory
} from '../../entities';

// a seed phrase in a link arrives quoted, and with `+` or `%20` between the words
export function parseFlameDevnetSeedParam(raw: string): string[] {
    return raw
        .replace(/^["']|["']$/g, '')
        .replace(/\+/g, ' ')
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 0);
}

const newFlameDevnetPortfolioMeta = (
    mnemonicAccessor: IMnemonicAccessor,
    name: string
): PortfolioMeta => ({
    name,
    icon: PortfolioIdBip39Imported.getFallbackEmoji(mnemonicAccessor)
});

export function useExistingFlameDevnetPortfolio(
    mnemonicResource: MnemonicResource
): Portfolio | undefined {
    const portfolios = usePortfolios();

    return useMemo(() => {
        const id = PortfolioIdFlameDevnet.create(mnemonicResource);
        return portfolios.find(portfolio => portfolio.id.isEq(id));
    }, [portfolios, mnemonicResource]);
}

export function useFlameDevnetWalletPreview(mnemonicResource: MnemonicResource, name: string) {
    const id = useMemo(() => PortfolioIdFlameDevnet.create(mnemonicResource), [mnemonicResource]);

    const walletQuery = useQuery({
        queryKey: portfolioKeys.flameDevnetPreview({ portfolioId: id.toString() }).toKey(),
        queryFn: () => PortfolioFlameDevnet.createPreviewFlameWallet(mnemonicResource),
        staleTime: Infinity,
        gcTime: 0,
        retry: false
    });

    const meta = useMemo(
        () => newFlameDevnetPortfolioMeta(mnemonicResource, name),
        [mnemonicResource, name]
    );

    return { meta, walletQuery };
}

export function useImportFlameDevnetPortfolioFromSeed() {
    const { mutateAsync: importFlameDevnetPortfolio } = useImportFlameDevnetPortfolio();
    const createEncryptor = useUnlockableSecureSecretEncryptorFactory();

    return useMutation<void, Error, { mnemonicResource: MnemonicResource; meta: PortfolioMeta }>({
        async mutationFn({ mnemonicResource, meta }) {
            using secureSecretEncryptor = createEncryptor();
            await secureSecretEncryptor.unlockEncryption();

            await importFlameDevnetPortfolio({
                mnemonicAccessor: mnemonicResource,
                secureSecretEncryptor,
                meta
            });
        }
    });
}
