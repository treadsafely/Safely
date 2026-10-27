import { SendFormError } from '../errors';
import { SEND_FORM_FEATURES_BY_CHAIN } from '../utils';
import type { SendFormEvent, SendFormMachineContext } from './types';
import { hasFiatPrice } from '../validators/amount';

type GuardArg = { context: SendFormMachineContext; event: SendFormEvent };

export const isRecipientInputEmpty = ({ context }: GuardArg): boolean =>
    context.values.recipient === '';

export const hasParsedRecipient = ({ context }: GuardArg): boolean =>
    context.parsed.recipient !== undefined;

export const hasSelfTransferError = ({ context }: GuardArg): boolean =>
    context.errors.recipient === SendFormError.SELF_TRANSFER;

export const hasRecipientError = ({ context }: GuardArg): boolean =>
    context.errors.recipient !== undefined;

export const isRecipientStepValid = ({ context }: GuardArg): boolean =>
    !!context.parsed.recipient && !context.errors.recipient;

export const isAmountStepValid = ({ context }: GuardArg): boolean =>
    !!context.parsed.amount &&
    !!context.parsed.asset &&
    !context.errors.amount &&
    !context.errors.asset;

export const recipientHasMemo = ({ context }: GuardArg): boolean =>
    !!context.parsed.recipient &&
    SEND_FORM_FEATURES_BY_CHAIN[context.parsed.recipient.blockchain].hasMemo;

export const shouldCreateContact = ({ context }: GuardArg): boolean =>
    !!context.parsed.recipient &&
    SEND_FORM_FEATURES_BY_CHAIN[context.parsed.recipient.blockchain].canSaveContact &&
    context.values.addressBookName.trim().length > 0 &&
    !context.suggestion.selectedId;

export const canEnterMax = ({ context }: GuardArg): boolean =>
    !!context.parsed.maxValue && context.parsed.maxValue.weiAmount > 0n && !!context.parsed.asset;

export const shouldRestoreMax = ({ context }: GuardArg): boolean =>
    context.values.isMax &&
    !!context.parsed.maxValue &&
    context.parsed.maxValue.weiAmount > 0n &&
    !!context.parsed.asset;

export const shouldResetOnSubmit = ({ context }: GuardArg): boolean => context.shouldResetForm();

export const isAmountValueUnchanged = ({ context, event }: GuardArg): boolean =>
    event.type === 'SET_AMOUNT' && event.value === context.values.amount;

export const isAmountValueEmpty = ({ event }: GuardArg): boolean =>
    event.type === 'SET_AMOUNT' && event.value === '';

export const isAmountContextEmpty = ({ context }: GuardArg): boolean =>
    context.values.amount === '' && !context.parsed.amount;

export const canSwitchAmountInputType = ({ context, event }: GuardArg): boolean =>
    event.type === 'SET_AMOUNT_INPUT_TYPE' &&
    (event.value === 'crypto' || hasFiatPrice(context.parsed.asset));

export const isNewSuggestion = ({ context, event }: GuardArg): boolean =>
    event.type === 'SELECT_SUGGESTION' && context.suggestion.selectedId !== event.id;

export const guards = {
    isRecipientInputEmpty,
    hasParsedRecipient,
    hasSelfTransferError,
    hasRecipientError,
    isRecipientStepValid,
    isAmountStepValid,
    recipientHasMemo,
    shouldCreateContact,
    canEnterMax,
    shouldRestoreMax,
    shouldResetOnSubmit,
    isAmountValueUnchanged,
    isAmountValueEmpty,
    isAmountContextEmpty,
    isNewSuggestion,
    canSwitchAmountInputType
};
