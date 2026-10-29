import type { RatedCryptoAssetAmount } from '@safely/core';

import {
    useActivePortfolio,
    useActiveWalletMeta,
    useCreateContact,
    useNumberFormatter
} from '../../../../entities';
import { useAmountInputType, useSetAmountInputType } from '../amountInputType';
import type { FetchMaxValue, SendFormMachineInput } from '../machine/types';
import type {
    ContactSuggestion,
    OwnAddresses,
    PortfolioSuggestion,
    SendFormInitialValues,
    SendFormResult
} from '../types';

export interface UseSendFormMachineInputProps {
    onSubmit: (result: SendFormResult, onSuccess: () => void) => void;
    shouldResetForm: boolean;
    initialValues: SendFormInitialValues | undefined;
    portfolioSuggestions: PortfolioSuggestion[];
    contactSuggestions: ContactSuggestion[];
    ratedAssets: RatedCryptoAssetAmount[];
    ownAddresses: OwnAddresses;
    fetchMaxValue: FetchMaxValue;
}

export function useSendFormMachineInput(props: UseSendFormMachineInputProps): SendFormMachineInput {
    const {
        onSubmit,
        shouldResetForm,
        initialValues,
        portfolioSuggestions,
        contactSuggestions,
        ratedAssets,
        ownAddresses,
        fetchMaxValue
    } = props;

    const formatter = useNumberFormatter();
    const activePortfolio = useActivePortfolio();
    const activeWalletMeta = useActiveWalletMeta();
    const { mutateAsync: createContact } = useCreateContact();

    const rememberedInputType = useAmountInputType();
    const persistAmountInputType = useSetAmountInputType();

    return {
        resolvedInitialValues: initialValues,
        formatter,
        portfolioSuggestions,
        contactSuggestions,
        ratedAssets,
        activeWallet: {
            id: activePortfolio.id.toString(),
            meta: activeWalletMeta
        },
        ownAddresses,
        networkType: activePortfolio.networkType,
        shouldResetForm: () => shouldResetForm,
        onSubmit,
        createContact,
        fetchMaxValue,
        persistAmountInputType,
        initialAmountInputType: rememberedInputType
    };
}
