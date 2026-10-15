import { useMachine } from '@xstate/react';

import type { BLOCKCHAIN_NAME } from '@safely/core';

import { useActiveBtcRatedAmount, useActiveFlameRatedAmount } from '../../../../entities';
import { createSendFormMachine } from '../machine/machine';
import type { SendFormInitialValues, SendFormResult } from '../types';
import type { SendFormView } from '../view';
import { useSendFormDispatchers } from './useSendFormDispatchers';
import { useSendFormMachineInput } from './useSendFormMachineInput';
import { useSendFormSuggestions } from './useSendFormSuggestions';
import { useSendFormView } from './useSendFormView';

const sendFormMachine = createSendFormMachine();

export interface UseSendFormOptions {
    onSubmit: (result: SendFormResult, onSuccess: () => void) => void;
    shouldResetForm?: boolean;
    initialValues?: SendFormInitialValues;
    suggestionsBlockchain?: BLOCKCHAIN_NAME;
}

export function useSendForm(props: UseSendFormOptions): SendFormView {
    const { onSubmit, shouldResetForm = true, initialValues, suggestionsBlockchain } = props;

    const { portfolioSuggestions, contactSuggestions } =
        useSendFormSuggestions(suggestionsBlockchain);
    const { data: btc } = useActiveBtcRatedAmount();
    const { data: flame } = useActiveFlameRatedAmount();
    const ratedAssets = [btc, flame].filter(asset => !!asset);

    const machineInput = useSendFormMachineInput({
        onSubmit,
        shouldResetForm,
        initialValues,
        portfolioSuggestions,
        contactSuggestions,
        ratedAssets
    });

    const [snapshot, send] = useMachine(sendFormMachine, { input: machineInput });

    const dispatchers = useSendFormDispatchers(send);

    return useSendFormView({
        snapshot,
        dispatchers
    });
}
