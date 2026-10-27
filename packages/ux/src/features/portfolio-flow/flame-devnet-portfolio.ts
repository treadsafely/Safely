import { useMutation } from '@tanstack/react-query';

import { MnemonicResource, PortfolioIdBip39Imported } from '@safely/core';

import {
    useImportFlameDevnetPortfolio,
    useNewPortfolioFallbackName,
    useUnlockableSecretEncryptorFactory
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

export function useImportFlameDevnetPortfolioFromSeed() {
    const { mutateAsync: importFlameDevnetPortfolio } = useImportFlameDevnetPortfolio();
    const createEncryptor = useUnlockableSecretEncryptorFactory();
    const fallbackName = useNewPortfolioFallbackName();

    return useMutation<void, Error, { mnemonic: string[] }>({
        async mutationFn({ mnemonic }) {
            using mnemonicAccessor = new MnemonicResource(mnemonic);
            using secretEncryptor = createEncryptor();
            await secretEncryptor.unlockEncryption();

            await importFlameDevnetPortfolio({
                mnemonicAccessor,
                secretEncryptor,
                meta: {
                    name: fallbackName,
                    icon: PortfolioIdBip39Imported.getFallbackEmoji(mnemonicAccessor)
                }
            });
        }
    });
}
