import {
    type ContactSuggestion,
    type PortfolioSuggestion,
    type SendFormErrors,
    type SendFormInitialValues,
    type SendFormValues,
    type SendSuggestionState,
    SuggestionSource
} from '../types';
import type { SendFormMachineContext, SendFormMachineInput } from './types';
import { type RecipientValidationResult, validateRecipientInput } from '../validators/recipient';

export const EMPTY_SUGGESTION: SendSuggestionState = {
    selectedId: undefined,
    portfoliosIds: undefined,
    contactsIds: undefined,
    source: undefined
};

export const DEFAULT_VALUES: SendFormValues = {
    recipient: '',
    addressBookName: '',
    amount: '',
    amountInputType: 'crypto',
    isMax: false,
    assetId: '',
    memo: ''
};

export const DEFAULT_PARSED = {
    recipient: undefined,
    amount: undefined,
    asset: undefined,
    maxValue: undefined
};

export const DEFAULT_ERRORS: SendFormErrors = {
    recipient: undefined,
    amount: undefined,
    asset: undefined,
    memo: undefined
};

export function withResetDependentValues(values: SendFormValues): SendFormValues {
    return {
        ...values,
        amount: '',
        assetId: '',
        isMax: false,
        memo: ''
    };
}

export function withResetDependentParsed(parsed: SendFormMachineContext['parsed']) {
    return {
        ...parsed,
        amount: undefined,
        asset: undefined,
        maxValue: undefined
    };
}

export function withResetDependentErrors(errors: SendFormErrors): SendFormErrors {
    return {
        ...errors,
        amount: undefined,
        asset: undefined,
        memo: undefined
    };
}

function computeInitialSuggestion(
    initialValues: SendFormInitialValues | undefined,
    portfolioSuggestions: PortfolioSuggestion[],
    contactSuggestions: ContactSuggestion[]
): SendSuggestionState | undefined {
    const address = initialValues?.recipient;
    if (!address) return undefined;

    const match =
        portfolioSuggestions.find(s => s.address === address) ??
        contactSuggestions.find(s => s.address === address);
    if (!match) return undefined;

    return {
        selectedId: match.id,
        portfoliosIds: portfolioSuggestions.map(s => s.id),
        contactsIds: contactSuggestions.map(s => s.id),
        source: SuggestionSource.USER_DEFINED
    };
}

export function suggestionFromValidatorResult(
    result: RecipientValidationResult,
    source: SuggestionSource
): SendSuggestionState | undefined {
    if (!result.suggestion) return undefined;

    const { id: selectedId, portfoliosIds, contactsIds } = result.suggestion;

    return {
        selectedId,
        contactsIds,
        portfoliosIds,
        source
    };
}

type ResetDeps = Omit<SendFormMachineContext, 'values' | 'parsed' | 'errors' | 'suggestion'>;

export function buildEmptyContext(deps: ResetDeps): SendFormMachineContext {
    return {
        ...deps,
        values: DEFAULT_VALUES,
        parsed: DEFAULT_PARSED,
        errors: DEFAULT_ERRORS,
        suggestion: EMPTY_SUGGESTION
    };
}

function normalizeInitialAmount(input: SendFormMachineInput): string | undefined {
    const raw = input.resolvedInitialValues?.amount;
    if (raw === undefined) return undefined;

    const normalized = input.formatter.normalizeCanonicalInput(raw);

    return normalized.status === 'ok' ? normalized.value : undefined;
}

export function buildInitialContext(input: SendFormMachineInput): SendFormMachineContext {
    const baseContext = buildEmptyContext(input);

    const initialValues = input.resolvedInitialValues;
    const initialAmount = normalizeInitialAmount(input);
    const amountInputType =
        initialValues?.amountInputType ??
        (initialAmount === undefined ? input.initialAmountInputType : 'crypto');

    if (!initialValues?.recipient) {
        return {
            ...baseContext,
            values: {
                ...baseContext.values,
                amountInputType
            }
        };
    }

    const initialSuggestion = computeInitialSuggestion(
        initialValues,
        input.portfolioSuggestions,
        input.contactSuggestions
    );

    const result = validateRecipientInput(initialValues.recipient, {
        ownAddresses: input.ownAddresses,
        networkType: input.networkType,
        portfolioSuggestions: input.portfolioSuggestions,
        contactSuggestions: input.contactSuggestions,
        preferredSuggestionId: initialSuggestion?.selectedId
    });

    const allDraftIds = [
        ...(initialSuggestion?.portfoliosIds ?? []),
        ...(initialSuggestion?.contactsIds ?? [])
    ];
    const draftSuggestionValid =
        !!initialSuggestion?.selectedId && allDraftIds.includes(initialSuggestion.selectedId);

    const validatorSuggestion = suggestionFromValidatorResult(
        result,
        SuggestionSource.USER_DEFINED
    );

    return {
        ...baseContext,
        values: {
            ...DEFAULT_VALUES,
            recipient: initialValues.recipient,
            addressBookName: initialValues.addressBookName ?? '',
            amount: initialAmount ?? '',
            amountInputType
        },
        parsed: {
            recipient: result.recipient,
            asset: undefined,
            amount: undefined,
            maxValue: undefined
        },
        errors: {
            recipient: result.error,
            amount: undefined,
            asset: undefined,
            memo: undefined
        },
        suggestion:
            validatorSuggestion ?? (draftSuggestionValid ? initialSuggestion : EMPTY_SUGGESTION)
    };
}
