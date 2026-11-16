import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { BtcNetwork, LedgerController, ledgerAccountToBtcWallet } from '@safely/core';

import { ledgerKeys } from './keys';
import { useLedgerSession } from './LedgerSessionProvider';
import { useAccountlessBtcConfirmedBalances } from '../../entities/btc-blockchain';

export const LEDGER_ACCOUNT_COUNT = 10;
const DERIVATIONS_SEARCH_TIMEOUT = 20_000;

export const useLedgerAccounts = () => {
    const { getLedgerKit, disconnect, sessionId, selectedDevice } = useLedgerSession();

    const { data, isError } = useQuery({
        queryKey: ledgerKeys.accounts(selectedDevice?.id).toKey(),
        enabled: sessionId !== null,
        staleTime: Infinity,
        retry: false,
        queryFn: async () => {
            const ledger = new LedgerController(getLedgerKit(), sessionId ?? '');

            const accounts = await ledger.discoverAccounts({ count: LEDGER_ACCOUNT_COUNT });
            const masterFingerprint = await ledger.getMasterFingerprint();

            return { accounts, masterFingerprint };
        }
    });

    const accounts = data?.accounts ?? [];
    const masterFingerprint = data?.masterFingerprint;
    const isLoading = !data && !isError;

    const wallets = useMemo(
        () => accounts.map(account => ledgerAccountToBtcWallet(account, BtcNetwork.MAINNET)),
        [accounts]
    );
    const balances = useAccountlessBtcConfirmedBalances(wallets);

    const [isTimedOut, setIsTimedOut] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            setIsTimedOut(false);

            return;
        }

        const id = setTimeout(() => setIsTimedOut(true), DERIVATIONS_SEARCH_TIMEOUT);

        return () => clearTimeout(id);
    }, [isLoading]);

    return {
        accounts,
        balances,
        masterFingerprint,
        retry: disconnect,
        isDerived: accounts.length > 0,
        isFailed: isError || isTimedOut
    };
};
