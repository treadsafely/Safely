import type { PortfolioNetworkType, Recipient } from '@safely/core';
import { BLOCKCHAIN_NAME, BtcRecipient, FlameRecipient } from '@safely/core';

import { detectAddressType } from '../../../../shared/address';
import { SendFormError } from '../errors';
import type { ContactSuggestion, PortfolioSuggestion } from '../types';
import { MIN_RECIPIENT_ADDRESS_LENGTH, createRecipientSchema } from '../utils';

function parseRecipient(
    input: string,
    networkType: PortfolioNetworkType,
    canSendFlame: boolean
): Recipient | SendFormError {
    const detected = detectAddressType(input, networkType);

    if (!detected) {
        return SendFormError.INVALID_WALLET_ADDRESS;
    }

    switch (detected.blockchain) {
        case BLOCKCHAIN_NAME.BTC:
            return new BtcRecipient(detected.address);
        case BLOCKCHAIN_NAME.FLAME:
            return canSendFlame
                ? new FlameRecipient(detected.address)
                : SendFormError.UNSUPPORTED_BLOCKCHAIN;
        default:
            return SendFormError.UNSUPPORTED_BLOCKCHAIN;
    }
}

export interface RecipientValidationResult {
    recipient: Recipient | undefined;
    error: string | undefined;
    suggestion?: {
        id: string;
        address: string;
        label: string;
        portfoliosIds: string[];
        contactsIds: string[];
    };
}

export function validateRecipientInput(
    value: string,
    context: {
        activeWalletAddress: string;
        flameWalletAddress: string | null;
        networkType: PortfolioNetworkType;
        portfolioSuggestions: PortfolioSuggestion[];
        contactSuggestions: ContactSuggestion[];
        preferredSuggestionId?: string;
    }
): RecipientValidationResult {
    if (value.trim().length < MIN_RECIPIENT_ADDRESS_LENGTH) {
        return { recipient: undefined, error: undefined };
    }

    const zodResult = createRecipientSchema(context.networkType).safeParse(value);
    if (!zodResult.success) {
        return {
            recipient: undefined,
            error: zodResult.error.issues[0]?.message ?? SendFormError.INVALID_WALLET_ADDRESS
        };
    }

    const parsedRecipient = parseRecipient(
        zodResult.data,
        context.networkType,
        context.flameWalletAddress !== null
    );
    if (typeof parsedRecipient === 'string') {
        return { recipient: undefined, error: parsedRecipient };
    }

    const preferredMatch = context.preferredSuggestionId
        ? [...context.portfolioSuggestions, ...context.contactSuggestions].find(
              s => s.id === context.preferredSuggestionId && s.address === parsedRecipient.address
          )
        : undefined;

    const portfolioMatch =
        preferredMatch ??
        context.portfolioSuggestions.find(s => s.address === parsedRecipient.address);
    const contactMatch = portfolioMatch
        ? undefined
        : context.contactSuggestions.find(s => s.address === parsedRecipient.address);
    const match = portfolioMatch ?? contactMatch;

    const suggestion = match
        ? {
              id: match.id,
              address: parsedRecipient.address,
              label: match.meta.name,
              portfoliosIds: context.portfolioSuggestions.map(s => s.id),
              contactsIds: context.contactSuggestions.map(s => s.id)
          }
        : undefined;

    const ownAddress =
        parsedRecipient.blockchain === BLOCKCHAIN_NAME.FLAME
            ? context.flameWalletAddress
            : context.activeWalletAddress;
    if (parsedRecipient.address === ownAddress) {
        return { recipient: undefined, error: SendFormError.SELF_TRANSFER, suggestion };
    }

    return {
        recipient: parsedRecipient,
        error: undefined,
        suggestion
    };
}
