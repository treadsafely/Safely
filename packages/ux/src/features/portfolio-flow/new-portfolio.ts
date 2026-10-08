import { useMutation } from '@tanstack/react-query';

import type {
    IMnemonicAccessor,
    Portfolio,
    PortfolioMeta,
    PortfolioMetaIcon,
    PortfolioNetworkType
} from '@safely/core';
import {
    assertUnreachable,
    PortfolioIdBip39Imported,
    PortfolioIdBip39MasterKeyDerived,
    PortfolioWatchOnlyBtc,
    toPortfolioIdWatchOnly
} from '@safely/core';
import type { SNextDerivingPortfolioInfo } from '@safely/sync-storage';

import type { AccountPortfolioSource } from '../../entities';
import {
    useAddWatchOnlyPortfolio,
    useGeneratePortfolio,
    useImportPortfolio,
    useUnlockableSecretEncryptorFactory
} from '../../entities';
import { useAppContext } from '../../shared';

export type NewPortfolioSource = Exclude<AccountPortfolioSource, { kind: 'ledger' }>;

export type NewPortfolioResolution =
    { kind: 'duplicate'; portfolio: Portfolio } | { kind: 'new'; icon: PortfolioMetaIcon };

export function resolveGeneratedPortfolioIcon(
    nextDerivingInfo: SNextDerivingPortfolioInfo | undefined
): PortfolioMetaIcon {
    if (nextDerivingInfo?.emoji) {
        return { type: 'emoji', value: nextDerivingInfo.emoji };
    }

    return PortfolioIdBip39MasterKeyDerived.getFallbackEmoji(nextDerivingInfo?.index ?? 0);
}

export function resolveWatchOnlyPortfolio(
    input: string,
    networkType: PortfolioNetworkType,
    portfolios: Portfolio[]
): NewPortfolioResolution {
    const id = toPortfolioIdWatchOnly(PortfolioWatchOnlyBtc.resolveUserInput(input, networkType));
    const existing = portfolios.find(portfolio => portfolio.id.isEq(id));

    if (existing) {
        return { kind: 'duplicate', portfolio: existing };
    }

    return { kind: 'new', icon: id.getFallbackEmoji() };
}

export async function resolveImportedPortfolio(
    mnemonicAccessor: IMnemonicAccessor,
    networkType: PortfolioNetworkType,
    portfolios: Portfolio[]
): Promise<NewPortfolioResolution> {
    const id = await PortfolioIdBip39Imported.create(mnemonicAccessor, networkType);
    const existing = portfolios.find(portfolio => portfolio.id.isEq(id));

    if (existing) {
        return { kind: 'duplicate', portfolio: existing };
    }

    return { kind: 'new', icon: PortfolioIdBip39Imported.getFallbackEmoji(mnemonicAccessor) };
}

export function useAddPortfolioFromSource() {
    const { mutateAsync: importPortfolio } = useImportPortfolio();
    const { mutateAsync: generatePortfolio } = useGeneratePortfolio();
    const { mutateAsync: addWatchOnlyPortfolio } = useAddWatchOnlyPortfolio();
    const createEncryptor = useUnlockableSecretEncryptorFactory();
    const {
        storage: {
            sync: { getSecureEncrypted }
        }
    } = useAppContext();

    return useMutation<void, Error, { source: NewPortfolioSource; meta: PortfolioMeta }>({
        async mutationFn({ source, meta }) {
            switch (source.kind) {
                case 'watchOnly':
                    await addWatchOnlyPortfolio({ input: source.input, meta });
                    return;
                case 'imported': {
                    using secretEncryptor = createEncryptor();
                    await secretEncryptor.unlockEncryption();

                    await importPortfolio({
                        mnemonicAccessor: source.mnemonicAccessor,
                        secretEncryptor,
                        meta,
                        networkType: source.networkType
                    });
                    return;
                }
                case 'generated': {
                    using secureEncryptedStorage = getSecureEncrypted();
                    await secureEncryptedStorage.unlock();

                    await generatePortfolio({ meta, secureEncryptedStorage });
                    return;
                }
                default:
                    assertUnreachable(source);
            }
        }
    });
}
