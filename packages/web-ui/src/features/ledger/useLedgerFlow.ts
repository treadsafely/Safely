import { useCallback, useEffect, useRef, useState } from 'react';

import type { Portfolio, PortfolioMeta } from '@safely/core';
import { PortfolioAlreadyExistsError } from '@safely/core';
import type { LedgerAccountsSelection, SaveLedgerAccounts } from '@safely/ux';
import {
    getLedgerPortfolioDraft,
    SecurityCheckCancelledError,
    useErrorToast,
    useLedgerSession
} from '@safely/ux';

export type LedgerFlowStep =
    | 'connect'
    | 'discovery'
    | 'pairing'
    | 'pairingSuccess'
    | 'pairingUnsuccess'
    | 'import'
    | 'customize';

export type LedgerFlowProps = {
    portfolios: Portfolio[];
    onExit: () => void;
    onDone: () => void;
    onDuplicate?: (portfolio: Portfolio) => void;
    onAccountsSelected?: (selection: LedgerAccountsSelection) => void;
    saveAccounts?: SaveLedgerAccounts;
};

export function useLedgerFlow(props: LedgerFlowProps) {
    const { portfolios, onExit, onDone, onDuplicate, onAccountsSelected, saveAccounts } = props;

    const errorToast = useErrorToast({});
    const { disconnect, setFindMorePortfolioId } = useLedgerSession();

    const [step, setStep] = useState<LedgerFlowStep>('connect');
    const [isAppNotInstalled, setIsAppNotInstalled] = useState(false);
    const [draft, setDraft] = useState<PortfolioMeta | null>(null);

    const selection = useRef<LedgerAccountsSelection | null>(null);

    const reset = useCallback(() => {
        selection.current = null;
        setFindMorePortfolioId(null);
        setDraft(null);
        setIsAppNotInstalled(false);
        setStep('connect');
    }, [setFindMorePortfolioId]);

    useEffect(() => reset, [reset]);

    const start = useCallback(
        (findMorePortfolioId: string | null = null) => {
            reset();
            setFindMorePortfolioId(findMorePortfolioId);
        },
        [reset, setFindMorePortfolioId]
    );

    const backToConnect = useCallback(() => {
        setFindMorePortfolioId(null);
        setStep('connect');
    }, [setFindMorePortfolioId]);

    const continueFromConnect = useCallback(async () => {
        await disconnect();
        setStep('discovery');
    }, [disconnect]);

    const onDeviceFound = useCallback(() => setStep('pairing'), []);

    const onDiscoveryError = useCallback(() => setStep('connect'), []);

    const onPaired = useCallback(() => setStep('pairingSuccess'), []);

    const onPairingFailed = useCallback((isBitcoinAppMissing: boolean) => {
        setIsAppNotInstalled(isBitcoinAppMissing);
        setStep('pairingUnsuccess');
    }, []);

    const retryPairing = useCallback(async () => {
        await disconnect();
        setStep('discovery');
    }, [disconnect]);

    const continueToImport = useCallback(() => setStep('import'), []);

    const onImportRetry = useCallback(() => setStep('discovery'), []);

    const selectAccounts = useCallback(
        (selected: LedgerAccountsSelection) => {
            if (onAccountsSelected) {
                onAccountsSelected(selected);
                return;
            }

            selection.current = selected;
            setDraft(getLedgerPortfolioDraft(selected, portfolios.length));
            setStep('customize');
        },
        [onAccountsSelected, portfolios.length]
    );

    const backFromCustomize = useCallback(() => setStep('import'), []);

    const save = useCallback(
        async (meta: PortfolioMeta) => {
            const selected = selection.current;

            if (selected === null || saveAccounts === undefined) {
                return;
            }

            try {
                await saveAccounts(selected, meta);

                reset();
                onDone();
            } catch (error) {
                if (error instanceof PortfolioAlreadyExistsError && error.existingPortfolio) {
                    const existingId = error.existingPortfolio.id;
                    const duplicate = portfolios.find(portfolio => portfolio.id.isEq(existingId));

                    if (duplicate && onDuplicate) {
                        reset();
                        onDuplicate(duplicate);
                        return;
                    }
                }

                if (!(error instanceof SecurityCheckCancelledError)) {
                    errorToast(error);
                }
            }
        },
        [saveAccounts, reset, onDone, portfolios, onDuplicate, errorToast]
    );

    return {
        step,
        draft,
        isAppNotInstalled,
        portfolios,
        start,
        reset,
        exit: onExit,
        backToConnect,
        continueFromConnect,
        onDeviceFound,
        onDiscoveryError,
        onPaired,
        onPairingFailed,
        retryPairing,
        continueToImport,
        onImportRetry,
        selectAccounts,
        backFromCustomize,
        save
    };
}
