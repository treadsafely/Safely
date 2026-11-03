import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { IMnemonicAccessor, Portfolio, PortfolioMeta, MnemonicResource } from '@safely/core';
import {
    PORTFOLIO_NAME_MAX_LENGTH,
    PortfolioFlameDevnet,
    PortfolioIdBip39Imported,
    PortfolioIdFlameDevnet
} from '@safely/core';

import {
    portfolioKeys,
    useErrorToast,
    useFlameWalletOutputs,
    useImportFlameDevnetPortfolio,
    usePortfolios,
    useSetActivePortfolio,
    useToast,
    useUnlockableSecureSecretEncryptorFactory
} from '../../entities';
import { SecurityCheckCancelledError, useTranslate } from '../../shared';

const IMPORT_ERRORS = {
    InvalidMnemonicError: 'importWalletScreen.errors.invalidMnemonic',
    PortfolioGenerationFailedError: 'importWalletScreen.errors.failedToGenerate'
};

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

export function parseFlameDevnetWalletNameParam(raw: string): string | undefined {
    // any site can craft the link: a bidi override or zero-width character would spoof the name
    const name = raw.replace(/[\p{Cc}\p{Cf}]/gu, '').trim();
    // by code point: a UTF-16 slice can split a surrogate pair, which encodes as invalid UTF-8
    return Array.from(name).slice(0, PORTFOLIO_NAME_MAX_LENGTH).join('').trim() || undefined;
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

export function useFlameDevnetImportPreview(
    mnemonicResource: MnemonicResource,
    walletName: string,
    onUnavailable: () => void
) {
    const errorToast = useErrorToast(IMPORT_ERRORS);
    const { meta, walletQuery } = useFlameDevnetWalletPreview(mnemonicResource, walletName);
    const wallet = walletQuery.data ?? null;
    const balance = useFlameWalletOutputs(wallet).data?.balance;

    const shownErrorRef = useRef<unknown>(null);
    useEffect(() => {
        const { error } = walletQuery;
        if (!error || shownErrorRef.current === error) return;

        shownErrorRef.current = error;
        errorToast(error);
        onUnavailable();
    }, [walletQuery, errorToast, onUnavailable]);

    return { meta, wallet, balance };
}

export function useFlameDevnetAccountImport(
    mnemonicResource: MnemonicResource,
    onDone: () => void
) {
    const t = useTranslate();
    const toast = useToast();
    const errorToast = useErrorToast(IMPORT_ERRORS);
    const duplicate = useRef(useExistingFlameDevnetPortfolio(mnemonicResource)).current;
    const { mutate: setActivePortfolio } = useSetActivePortfolio();
    const { mutateAsync: importPortfolio, isPending } = useImportFlameDevnetPortfolioFromSeed();

    useEffect(() => {
        if (!duplicate) return;

        setActivePortfolio({ id: duplicate.id });
        toast({ message: t('importFlameDevnetWallet.alreadyImported') });
        onDone();
    }, [duplicate, setActivePortfolio, toast, t, onDone]);

    const importWallet = useCallback(
        async (meta: PortfolioMeta): Promise<void> => {
            try {
                await importPortfolio({ mnemonicResource, meta });
            } catch (error) {
                if (!(error instanceof SecurityCheckCancelledError)) {
                    errorToast(error);
                }
                return;
            }

            toast({ message: t('importFlameDevnetWallet.imported') });
            onDone();
        },
        [importPortfolio, mnemonicResource, errorToast, toast, t, onDone]
    );

    return { isDuplicate: duplicate !== undefined, isPending, importWallet };
}
