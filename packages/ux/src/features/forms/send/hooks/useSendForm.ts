import { useMachine } from '@xstate/react';

import { useActiveBtcRatedAmount } from '../../../../entities';
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
}

export function useSendForm(props: UseSendFormOptions): SendFormView {
    const { onSubmit, shouldResetForm = true, initialValues } = props;

    const { portfolioSuggestions, contactSuggestions } = useSendFormSuggestions();
    const { data: btc } = useActiveBtcRatedAmount();
    const ratedAssets = btc ? [btc] : [];

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
