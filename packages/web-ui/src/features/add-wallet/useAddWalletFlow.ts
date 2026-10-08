import { useCallback, useEffect, useRef, useState } from 'react';

import type { Portfolio, PortfolioMeta } from '@safely/core';
import { MnemonicResource, PortfolioAlreadyExistsError, PortfolioNetworkType } from '@safely/core';
import {
    resolveGeneratedPortfolioIcon,
    resolveImportedPortfolio,
    resolveWatchOnlyPortfolio,
    SecurityCheckCancelledError,
    useActiveAccountStoreSlot,
    useAddPortfolioFromSource,
    useChangePortfolioMeta,
    useErrorToast,
    useNewPortfolioFallbackName,
    usePortfolios,
    useSetActivePortfolio
} from '@safely/ux';

import type { DisclosureProps } from '../../shared';
import { useDisclosure } from '../../shared';

export type AddWalletDraft = PortfolioMeta;

export type AddWalletStep = 'menu' | 'import' | 'watch' | 'duplicate' | 'customize';

type AddWalletSource =
    | { kind: 'generated' }
    | { kind: 'imported'; mnemonic: string[]; networkType: PortfolioNetworkType }
    | { kind: 'watchOnly'; input: string }
    | { kind: 'existing'; portfolio: Portfolio };

export function useAddWalletFlow(props: DisclosureProps) {
    const { isOpen, onOpen, onClose } = useDisclosure(props);
    const errorToast = useErrorToast({});
    const portfolios = usePortfolios();
    const defaultName = useNewPortfolioFallbackName();
    const { mutateAsync: setActivePortfolio } = useSetActivePortfolio();
    const { mutateAsync: changePortfolioMeta } = useChangePortfolioMeta();
    const { mutateAsync: addPortfolioFromSource } = useAddPortfolioFromSource();
    const nextDerivingInfo = useActiveAccountStoreSlot('nextDerivingPortfolioInfo');

    const [innerStep, setInnerStep] = useState<Exclude<AddWalletStep, 'menu'> | null>(null);
    const [draft, setDraft] = useState<AddWalletDraft | null>(null);
    const [duplicate, setDuplicate] = useState<Portfolio | null>(null);

    const source = useRef<AddWalletSource | null>(null);
    const networkType = useRef<PortfolioNetworkType>(PortfolioNetworkType.MAINNET);

    const step: AddWalletStep | null = isOpen ? (innerStep ?? 'menu') : null;

    useEffect(() => {
        source.current = null;
        setDraft(null);
        setDuplicate(null);
        setInnerStep(null);
    }, [isOpen]);

    const open = useCallback(() => {
        setInnerStep(null);
        onOpen();
    }, [onOpen]);

    const openImport = useCallback((network: PortfolioNetworkType) => {
        networkType.current = network;
        setInnerStep('import');
    }, []);

    const openWatch = useCallback(() => setInnerStep('watch'), []);

    const showDuplicate = useCallback((portfolio: Portfolio) => {
        setDuplicate(portfolio);
        setInnerStep('duplicate');
    }, []);

    const startCreate = useCallback(() => {
        source.current = { kind: 'generated' };
        setDraft({ name: defaultName, icon: resolveGeneratedPortfolioIcon(nextDerivingInfo) });
        setInnerStep('customize');
    }, [nextDerivingInfo, defaultName]);

    const onMnemonicReady = useCallback(
        async (mnemonic: string[]) => {
            using mnemonicAccessor = new MnemonicResource(mnemonic);

            try {
                const resolution = await resolveImportedPortfolio(
                    mnemonicAccessor,
                    networkType.current,
                    portfolios
                );

                if (resolution.kind === 'duplicate') {
                    showDuplicate(resolution.portfolio);
                    return;
                }

                source.current = { kind: 'imported', mnemonic, networkType: networkType.current };
                setDraft({ name: defaultName, icon: resolution.icon });
                setInnerStep('customize');
            } catch (error) {
                errorToast(error);
            }
        },
        [portfolios, showDuplicate, defaultName, errorToast]
    );

    const onWatchInputReady = useCallback(
        (input: string) => {
            const resolution = resolveWatchOnlyPortfolio(
                input,
                PortfolioNetworkType.MAINNET,
                portfolios
            );

            if (resolution.kind === 'duplicate') {
                showDuplicate(resolution.portfolio);
                return;
            }

            source.current = { kind: 'watchOnly', input };
            setDraft({ name: defaultName, icon: resolution.icon });
            setInnerStep('customize');
        },
        [portfolios, showDuplicate, defaultName]
    );

    const openDuplicate = useCallback(async () => {
        if (duplicate === null) {
            return;
        }

        onClose();
        await setActivePortfolio({ id: duplicate.id });
    }, [duplicate, onClose, setActivePortfolio]);

    const editDuplicate = useCallback(() => {
        if (duplicate === null) {
            return;
        }

        source.current = { kind: 'existing', portfolio: duplicate };
        setDraft({ name: duplicate.meta.name, icon: duplicate.meta.icon });
        setInnerStep('customize');
    }, [duplicate]);

    const save = useCallback(
        async (meta: AddWalletDraft) => {
            const pending = source.current;

            if (pending === null) {
                return;
            }

            try {
                if (pending.kind === 'existing') {
                    await changePortfolioMeta({ portfolio: pending.portfolio, meta });
                    await setActivePortfolio({ id: pending.portfolio.id });
                } else if (pending.kind === 'imported') {
                    using mnemonicAccessor = new MnemonicResource(pending.mnemonic);

                    await addPortfolioFromSource({
                        source: {
                            kind: 'imported',
                            mnemonicAccessor,
                            networkType: pending.networkType
                        },
                        meta
                    });
                } else if (pending.kind === 'watchOnly') {
                    await addPortfolioFromSource({
                        source: {
                            kind: 'watchOnly',
                            input: pending.input,
                            networkType: PortfolioNetworkType.MAINNET
                        },
                        meta
                    });
                } else {
                    await addPortfolioFromSource({ source: { kind: 'generated' }, meta });
                }

                onClose();
            } catch (error) {
                if (error instanceof PortfolioAlreadyExistsError && error.existingPortfolio) {
                    const existingId = error.existingPortfolio.id;
                    const existing = portfolios.find(portfolio => portfolio.id.isEq(existingId));

                    if (existing) {
                        showDuplicate(existing);
                        return;
                    }
                }

                if (!(error instanceof SecurityCheckCancelledError)) {
                    onClose();
                    throw error;
                }
            }
        },
        [
            onClose,
            changePortfolioMeta,
            setActivePortfolio,
            addPortfolioFromSource,
            portfolios,
            showDuplicate
        ]
    );

    return {
        step,
        draft,
        duplicate,
        open,
        close: onClose,
        openImport,
        openWatch,
        startCreate,
        onMnemonicReady,
        onWatchInputReady,
        openDuplicate,
        editDuplicate,
        save
    };
}
