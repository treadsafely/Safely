import { useMachine } from '@xstate/react';
import { useMemo } from 'react';

import type { RatedCryptoAssetAmount, Recipient } from '@safely/core';
import { BLOCKCHAIN_NAME } from '@safely/core';

import { useFetchMaxValue, useSendChains } from '../../../blockchain-send';
import { createSendFormMachine } from '../machine/machine';
import type { OwnAddresses, SendFormInitialValues, SendFormResult } from '../types';
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

    const { btc, flame } = useSendChains();
    const btcAddress = btc?.wallet.address;
    const flameAddress = flame?.wallet.receivingAddress;

    const ownAddresses = useMemo<OwnAddresses>(
        () => ({
            ...(btcAddress !== undefined && { [BLOCKCHAIN_NAME.BTC]: btcAddress }),
            ...(flameAddress !== undefined && { [BLOCKCHAIN_NAME.FLAME]: flameAddress })
        }),
        [btcAddress, flameAddress]
    );
    const blockchains = useMemo(
        () => Object.keys(ownAddresses) as Recipient['blockchain'][],
        [ownAddresses]
    );
    const ratedAssets = useMemo(
        () =>
            [btc?.ratedAsset, flame?.ratedAsset].filter(
                (asset): asset is RatedCryptoAssetAmount => asset !== undefined
            ),
        [btc?.ratedAsset, flame?.ratedAsset]
    );

    const { portfolioSuggestions, contactSuggestions } = useSendFormSuggestions(blockchains);
    const fetchMaxValue = useFetchMaxValue();

    const machineInput = useSendFormMachineInput({
        onSubmit,
        shouldResetForm,
        initialValues,
        portfolioSuggestions,
        contactSuggestions,
        ratedAssets,
        ownAddresses,
        fetchMaxValue
    });

    const [snapshot, send] = useMachine(sendFormMachine, { input: machineInput });

    const dispatchers = useSendFormDispatchers(send);

    return useSendFormView({
        snapshot,
        dispatchers
    });
}
