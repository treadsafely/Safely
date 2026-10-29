import { fromPromise } from 'xstate';

import type { Contact, CryptoAssetAmount, Recipient } from '@safely/core';

import type { CreateContactInput, FetchMaxValue } from './types';

export interface CreateContactActorInput {
    name: string;
    blockchain: CreateContactInput['addresses'][number]['blockchain'];
    address: string;
    createContact: (input: CreateContactInput) => Promise<Contact>;
}

export const createContactActor = fromPromise(
    async ({ input }: { input: CreateContactActorInput }) => {
        return input.createContact({
            name: input.name,
            addresses: [{ blockchain: input.blockchain, address: input.address }]
        });
    }
);

export interface FetchMaxValueActorInput {
    recipient: Recipient;
    fetchMaxValue: FetchMaxValue;
}

export const fetchMaxValueActor = fromPromise<
    CryptoAssetAmount | undefined,
    FetchMaxValueActorInput
>(async ({ input }) => input.fetchMaxValue(input.recipient));

export const actors = {
    createContactActor,
    fetchMaxValueActor
};
