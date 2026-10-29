import { useMutation } from '@tanstack/react-query';

import type { CryptoFiatRate } from '@safely/core';

import { resolveAmountUnit } from './amount-unit';
import type { AmountUnit } from './types';
import {
    useAccountStore,
    useActiveAccount,
    useActiveAccountSyncStorageSlotUpdate
} from '../../entities';

type AmountUnitKey = 'mainBalanceUnit' | 'homeScreenOrder' | 'transactionHistoryOrder';

const DEFAULT_AMOUNT_UNIT: AmountUnit = 'fiat';
const DEFAULT_SHOW_FULL_SENT_AMOUNT = false;

function useAmountUnit(key: AmountUnitKey): AmountUnit {
    const account = useActiveAccount();

    return useAccountStore(
        state =>
            state.accountsData.get(account.accountId)?.amountDisplay?.[key] ?? DEFAULT_AMOUNT_UNIT
    );
}

function useSetAmountUnit(key: AmountUnitKey): (unit: AmountUnit) => void {
    const update = useActiveAccountSyncStorageSlotUpdate('amountDisplay');

    const { mutate } = useMutation({
        mutationFn: (unit: AmountUnit) => update(draft => draft.set(key, unit))
    });

    return mutate;
}

export function useMainBalanceUnit(): AmountUnit {
    return useAmountUnit('mainBalanceUnit');
}

export function useDisplayedMainBalanceUnit(rate: CryptoFiatRate | null | undefined): AmountUnit {
    return resolveAmountUnit(useMainBalanceUnit(), rate);
}

export function useSetMainBalanceUnit(): (unit: AmountUnit) => void {
    return useSetAmountUnit('mainBalanceUnit');
}

export function useHomeScreenAmountOrder(): AmountUnit {
    return useAmountUnit('homeScreenOrder');
}

export function useDisplayedHomeScreenAmountOrder(
    rate: CryptoFiatRate | null | undefined
): AmountUnit {
    return resolveAmountUnit(useHomeScreenAmountOrder(), rate);
}

export function useSetHomeScreenAmountOrder(): (order: AmountUnit) => void {
    return useSetAmountUnit('homeScreenOrder');
}

export function useTransactionHistoryAmountOrder(): AmountUnit {
    return useAmountUnit('transactionHistoryOrder');
}

export function useSetTransactionHistoryAmountOrder(): (order: AmountUnit) => void {
    return useSetAmountUnit('transactionHistoryOrder');
}

export function useShowFullSentAmount(): boolean {
    const account = useActiveAccount();

    return useAccountStore(
        state =>
            state.accountsData.get(account.accountId)?.amountDisplay?.showFullSentAmount ??
            DEFAULT_SHOW_FULL_SENT_AMOUNT
    );
}

export function useSetShowFullSentAmount(): (isEnabled: boolean) => void {
    const update = useActiveAccountSyncStorageSlotUpdate('amountDisplay');

    const { mutate } = useMutation({
        mutationFn: (isEnabled: boolean) =>
            update(draft => draft.set('showFullSentAmount', isEnabled))
    });

    return mutate;
}
