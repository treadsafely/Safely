import * as x from 'xstate';
import { assertEvent, assign } from 'xstate';

import type { BtcAssetAmount, Contact } from '@safely/core';

import { SendFormError } from '../errors';
import { SuggestionSource } from '../types';
import {
    BLOCKCHAIN_DEFAULT_TOKENS,
    assetIdSchema,
    computeRecipientMeta,
    mapContactToSuggestions
} from '../utils';
import { actors } from './actors';
import {
    EMPTY_SUGGESTION,
    buildEmptyContext,
    buildInitialContext,
    suggestionFromValidatorResult,
    withResetDependentErrors,
    withResetDependentParsed,
    withResetDependentValues
} from './context';
import { guards } from './guards';
import type { SendFormEvent, SendFormMachineContext, SendFormMachineInput } from './types';
import {
    calculateMaxAmount,
    formatAmountForDisplay,
    isBtcAmountWithInputType,
    reformatForInputType,
    resolveAmountDecimals,
    validateAmount
} from '../validators/amount';
import { validateRecipientInput } from '../validators/recipient';

export const createSendFormMachine = () =>
    x
        .setup({
            types: {} as {
                events: SendFormEvent;
                context: SendFormMachineContext;
                input: SendFormMachineInput;
            },
            actors,
            guards,
            actions: {
                handleSetRecipient: assign(({ context, event }) => {
                    assertEvent(event, 'SET_RECIPIENT');

                    const recipientChanged = context.values.recipient !== event.value;
                    const baseSuggestion = recipientChanged ? EMPTY_SUGGESTION : context.suggestion;
                    const baseAddressBookName = recipientChanged
                        ? ''
                        : context.values.addressBookName;

                    const result = validateRecipientInput(event.value, {
                        activeWalletAddress: context.activeWallet.address,
                        networkType: context.networkType,
                        portfolioSuggestions: context.portfolioSuggestions,
                        contactSuggestions: context.contactSuggestions,
                        preferredSuggestionId: baseSuggestion.selectedId
                    });

                    return {
                        values: {
                            ...withResetDependentValues(context.values),
                            recipient: event.value,
                            addressBookName: baseAddressBookName
                        },
                        parsed: {
                            ...withResetDependentParsed(context.parsed),
                            recipient: result.recipient
                        },
                        errors: {
                            ...withResetDependentErrors(context.errors),
                            recipient: result.error
                        },
                        suggestion:
                            suggestionFromValidatorResult(result, SuggestionSource.USER_DEFINED) ??
                            baseSuggestion
                    };
                }),
                handleSelectSuggestion: assign(({ context, event }) => {
                    assertEvent(event, 'SELECT_SUGGESTION');

                    const visible = event.visible;
                    const combined = [...visible.portfolios, ...visible.contacts];
                    const picked = combined.find(s => s.id === event.id);

                    if (!picked) return {};

                    const result = validateRecipientInput(picked.address, {
                        activeWalletAddress: context.activeWallet.address,
                        networkType: context.networkType,
                        portfolioSuggestions: context.portfolioSuggestions,
                        contactSuggestions: context.contactSuggestions,
                        preferredSuggestionId: event.id
                    });

                    const newSuggestion = suggestionFromValidatorResult(
                        result,
                        SuggestionSource.SUGGESTIONS
                    ) ?? {
                        selectedId: event.id,
                        contactsIds: visible.contacts.map(s => s.id),
                        portfoliosIds: visible.portfolios.map(s => s.id),
                        source: SuggestionSource.SUGGESTIONS
                    };

                    return {
                        values: {
                            ...withResetDependentValues(context.values),
                            recipient: picked.address,
                            addressBookName: ''
                        },
                        parsed: {
                            ...withResetDependentParsed(context.parsed),
                            recipient: result.recipient
                        },
                        errors: {
                            ...withResetDependentErrors(context.errors),
                            recipient: result.error
                        },
                        suggestion: newSuggestion
                    };
                }),
                setAddressBookName: assign(({ context, event }) => {
                    assertEvent(event, 'SET_ADDRESS_BOOK_NAME');

                    return {
                        values: {
                            ...context.values,
                            addressBookName: event.name
                        }
                    };
                }),
                handleSetAmount: assign(({ context, event }) => {
                    assertEvent(event, 'SET_AMOUNT');

                    if (event.value === '') {
                        return {
                            values: {
                                ...context.values,
                                amount: '',
                                isMax: false
                            },
                            parsed: {
                                ...context.parsed,
                                amount: undefined
                            },
                            errors: {
                                ...context.errors,
                                amount: undefined
                            }
                        };
                    }

                    const result = validateAmount(
                        event.value,
                        context.values.amountInputType,
                        context.parsed.asset,
                        context.formatter
                    );

                    return {
                        values: { ...context.values, amount: result.formatted, isMax: false },
                        parsed: { ...context.parsed, amount: result.parsed },
                        errors: { ...context.errors, amount: result.error }
                    };
                }),
                handlePasteAmount: assign(({ context, event }) => {
                    assertEvent(event, 'PASTE_AMOUNT');

                    const { value, status } = context.formatter.normalizePastedInput(
                        event.raw,
                        resolveAmountDecimals(context.values.amountInputType, context.parsed.asset)
                    );

                    if (status === 'ambiguous') {
                        return {
                            values: {
                                ...context.values,
                                amount: '',
                                isMax: false
                            },
                            parsed: {
                                ...context.parsed,
                                amount: undefined
                            },
                            errors: {
                                ...context.errors,
                                amount: SendFormError.UNRECOGNIZED_AMOUNT
                            }
                        };
                    }

                    const result = validateAmount(
                        value,
                        context.values.amountInputType,
                        context.parsed.asset,
                        context.formatter
                    );

                    return {
                        values: { ...context.values, amount: result.formatted, isMax: false },
                        parsed: { ...context.parsed, amount: result.parsed },
                        errors: { ...context.errors, amount: result.error }
                    };
                }),
                handleSetAmountInputType: assign(({ context, event }) => {
                    assertEvent(event, 'SET_AMOUNT_INPUT_TYPE');

                    const baseValues = {
                        ...context.values,
                        amountInputType: event.value
                    };
                    const currentParsed = context.parsed.amount;
                    if (!currentParsed) {
                        return { values: baseValues };
                    }

                    const result = reformatForInputType(
                        currentParsed,
                        event.value,
                        context.formatter
                    );

                    return {
                        values: { ...baseValues, amount: result.formatted },
                        parsed: { ...context.parsed, amount: result.parsed }
                    };
                }),
                persistAmountInputType: ({ context, event }) => {
                    assertEvent(event, 'SET_AMOUNT_INPUT_TYPE');
                    context.persistAmountInputType(event.value);
                },
                handleSetAsset: assign(({ context, event }) => {
                    assertEvent(event, 'SET_ASSET');

                    const zodResult = assetIdSchema.safeParse(event.assetId);
                    if (!zodResult.success) {
                        return {
                            values: { ...context.values, assetId: event.assetId },
                            parsed: { ...context.parsed, asset: undefined },
                            errors: {
                                ...context.errors,
                                asset:
                                    zodResult.error.issues[0]?.message ?? SendFormError.SELECT_TOKEN
                            }
                        };
                    }

                    const parsedAsset = context.ratedAssets.find(
                        ({ amount }) => amount.asset.id.toString() === zodResult.data
                    );

                    if (!parsedAsset) {
                        return {
                            values: { ...context.values, assetId: event.assetId },
                            parsed: { ...context.parsed, asset: undefined },
                            errors: {
                                ...context.errors,
                                asset: SendFormError.UNABLE_TO_VALIDATE_TOKEN
                            }
                        };
                    }

                    const hadAmount = !!context.parsed.amount;
                    return {
                        values: {
                            ...context.values,
                            assetId: event.assetId,
                            amount: hadAmount ? '' : context.values.amount,
                            isMax: hadAmount ? false : context.values.isMax
                        },
                        parsed: {
                            ...context.parsed,
                            asset: parsedAsset,
                            amount: hadAmount ? undefined : context.parsed.amount
                        },
                        errors: { ...context.errors, asset: undefined }
                    };
                }),
                exitMax: assign(({ context }) => ({
                    values: { ...context.values, isMax: false, amount: '' },
                    parsed: { ...context.parsed, amount: undefined },
                    errors: { ...context.errors, amount: undefined }
                })),
                enterMax: assign(({ context }) => {
                    if (!context.parsed.asset || !context.parsed.maxValue) return {};
                    if (context.parsed.maxValue.weiAmount <= 0n) return {};

                    const result = calculateMaxAmount(
                        {
                            amount: context.parsed.maxValue,
                            price: context.parsed.asset.price
                        },
                        context.values.amountInputType,
                        context.formatter
                    );
                    if (!result) return {};

                    return {
                        values: { ...context.values, amount: result.formatted, isMax: true },
                        parsed: { ...context.parsed, amount: result.parsed },
                        errors: { ...context.errors, amount: undefined }
                    };
                }),
                assignMaxValue: assign(
                    ({ context }, params: { value: BtcAssetAmount | undefined }) => ({
                        parsed: { ...context.parsed, maxValue: params.value }
                    })
                ),
                assignCreatedContactSuggestion: assign(
                    ({ context }, params: { contact: Contact }) => {
                        const newSuggestionId = params.contact.id.toString();
                        const newSuggestions = mapContactToSuggestions(params.contact);

                        return {
                            values: {
                                ...context.values,
                                addressBookName: ''
                            },
                            contactSuggestions: [...context.contactSuggestions, ...newSuggestions],
                            suggestion: {
                                selectedId: newSuggestionId,
                                portfoliosIds: context.suggestion.portfoliosIds,
                                contactsIds: [
                                    ...(context.suggestion.contactsIds ?? []),
                                    newSuggestionId
                                ],
                                source: SuggestionSource.USER_DEFINED
                            }
                        };
                    }
                ),
                callOnSubmit: ({ context }) => {
                    const { parsed, suggestion } = context;
                    if (
                        !parsed.recipient ||
                        !parsed.amount ||
                        !isBtcAmountWithInputType(parsed.amount)
                    ) {
                        return;
                    }

                    context.onSubmit(
                        {
                            blockchain: parsed.recipient.blockchain,
                            recipient: parsed.recipient,
                            amount: parsed.amount,
                            isMax: context.values.isMax,
                            recipientMeta: computeRecipientMeta(
                                suggestion.selectedId,
                                context.portfolioSuggestions,
                                context.contactSuggestions
                            )
                        },
                        () => undefined
                    );
                },
                resetAll: assign(({ context }) => buildEmptyContext(context)),
                resolveDefaultAssetForChain: assign(({ context }) => {
                    if (context.parsed.asset) return {};
                    if (!context.parsed.recipient) return {};

                    const defaultAsset =
                        BLOCKCHAIN_DEFAULT_TOKENS[context.parsed.recipient.blockchain];
                    if (!defaultAsset) return {};

                    const defaultAssetId = defaultAsset.id.toString();
                    const ratedAsset = context.ratedAssets.find(
                        ({ amount }) => amount.asset.id.toString() === defaultAssetId
                    );
                    if (!ratedAsset) return {};

                    return {
                        parsed: { ...context.parsed, asset: ratedAsset },
                        values: { ...context.values, assetId: defaultAsset.id.toString() }
                    };
                }),
                applyInitialAmountIfNeeded: assign(({ context }) => {
                    if (!context.values.amount) return {};
                    if (!context.parsed.asset) return {};
                    if (context.parsed.amount) return {};
                    if (context.values.isMax) return {};

                    const result = validateAmount(
                        context.values.amount,
                        context.values.amountInputType,
                        context.parsed.asset,
                        context.formatter
                    );

                    const formatted = result.parsed
                        ? formatAmountForDisplay(
                              result.parsed.inputType,
                              result.parsed.fiatAssetAmount,
                              result.parsed.cryptoAssetAmount,
                              context.formatter
                          )
                        : result.formatted;

                    return {
                        values: { ...context.values, amount: formatted },
                        parsed: { ...context.parsed, amount: result.parsed },
                        errors: { ...context.errors, amount: result.error }
                    };
                })
            }
        })
        .createMachine({
            id: 'sendForm',
            initial: 'restoring',
            context: ({ input }) => buildInitialContext(input),
            on: {
                RESET: {
                    actions: 'resetAll',
                    target: '.editing.recipient.empty'
                }
            },
            states: {
                restoring: {
                    always: [
                        {
                            guard: 'isRecipientStepValid',
                            target: 'editing.recipient.valid'
                        },
                        {
                            guard: 'hasSelfTransferError',
                            target: 'editing.recipient.selfTransfer'
                        },
                        {
                            guard: 'hasRecipientError',
                            target: 'editing.recipient.invalid'
                        },
                        {
                            target: 'editing.recipient.empty'
                        }
                    ]
                },
                editing: {
                    initial: 'recipient',
                    states: {
                        recipient: {
                            initial: 'empty',
                            on: {
                                SET_RECIPIENT: {
                                    actions: 'handleSetRecipient',
                                    target: '.routing'
                                },
                                SELECT_SUGGESTION: {
                                    guard: 'isNewSuggestion',
                                    actions: 'handleSelectSuggestion',
                                    target: '.routing'
                                },
                                SET_ADDRESS_BOOK_NAME: {
                                    actions: 'setAddressBookName'
                                }
                            },
                            states: {
                                empty: {},
                                invalid: {},
                                selfTransfer: {},
                                valid: {
                                    invoke: {
                                        src: 'fetchMaxValueActor',
                                        input: ({ context }) => ({
                                            recipient: context.parsed.recipient!,
                                            fetchMaxValue: context.fetchMaxValue
                                        }),
                                        onDone: {
                                            actions: {
                                                type: 'assignMaxValue',
                                                params: ({ event }) => ({ value: event.output })
                                            }
                                        },
                                        onError: {
                                            actions: {
                                                type: 'assignMaxValue',
                                                params: () => ({ value: undefined })
                                            }
                                        }
                                    },
                                    on: {
                                        NEXT: [
                                            {
                                                guard: 'shouldCreateContact',
                                                target: 'creatingContact'
                                            },
                                            {
                                                guard: 'isRecipientStepValid',
                                                target: '#sendForm.editing.amount'
                                            }
                                        ]
                                    }
                                },
                                creatingContact: {
                                    invoke: {
                                        src: 'createContactActor',
                                        input: ({ context }) => {
                                            const recipient = context.parsed.recipient;
                                            if (!recipient) {
                                                throw new Error(
                                                    'parsed.recipient is required in creatingContact'
                                                );
                                            }

                                            return {
                                                name: context.values.addressBookName.trim(),
                                                blockchain: recipient.blockchain,
                                                address: recipient.address,
                                                createContact: context.createContact
                                            };
                                        },
                                        onDone: {
                                            actions: {
                                                type: 'assignCreatedContactSuggestion',
                                                params: ({ event }) => ({ contact: event.output })
                                            },
                                            target: '#sendForm.editing.amount'
                                        },
                                        onError: {
                                            // TODO: Add action like notification or smth
                                            target: '#sendForm.editing.amount'
                                        }
                                    }
                                },
                                routing: {
                                    always: [
                                        {
                                            guard: 'isRecipientInputEmpty',
                                            target: 'empty'
                                        },
                                        {
                                            guard: 'hasParsedRecipient',
                                            target: 'valid'
                                        },
                                        {
                                            guard: 'hasSelfTransferError',
                                            target: 'selfTransfer'
                                        },
                                        {
                                            guard: 'hasRecipientError',
                                            target: 'invalid'
                                        },
                                        {
                                            target: 'empty'
                                        }
                                    ]
                                }
                            }
                        },
                        amount: {
                            initial: 'idle',
                            entry: 'resolveDefaultAssetForChain',
                            invoke: {
                                src: 'fetchMaxValueActor',
                                input: ({ context }) => ({
                                    recipient: context.parsed.recipient!,
                                    fetchMaxValue: context.fetchMaxValue
                                }),
                                onDone: {
                                    actions: {
                                        type: 'assignMaxValue',
                                        params: ({ event }) => ({ value: event.output })
                                    }
                                },
                                onError: {
                                    actions: {
                                        type: 'assignMaxValue',
                                        params: () => ({ value: undefined })
                                    }
                                }
                            },
                            on: {
                                PREV: {
                                    target: 'recipient.valid'
                                },
                                SET_AMOUNT: {
                                    actions: 'handleSetAmount',
                                    target: '.routing'
                                },
                                PASTE_AMOUNT: {
                                    actions: 'handlePasteAmount',
                                    target: '.routing'
                                },
                                SET_AMOUNT_INPUT_TYPE: {
                                    actions: ['handleSetAmountInputType', 'persistAmountInputType']
                                },
                                ENTER_MAX: {
                                    guard: 'canEnterMax',
                                    target: '.max'
                                }
                            },
                            states: {
                                idle: {
                                    entry: 'applyInitialAmountIfNeeded',
                                    always: [
                                        {
                                            guard: 'shouldRestoreMax',
                                            target: 'max'
                                        },
                                        {
                                            guard: 'isAmountStepValid',
                                            target: 'manual'
                                        }
                                    ],
                                    on: {
                                        SET_ASSET: {
                                            actions: 'handleSetAsset'
                                        }
                                    }
                                },
                                manual: {
                                    on: {
                                        SET_ASSET: {
                                            actions: 'handleSetAsset',
                                            target: 'idle'
                                        },
                                        NEXT: {
                                            guard: 'isAmountStepValid',
                                            target: '#sendForm.submitted'
                                        }
                                    }
                                },
                                invalid: {
                                    on: {
                                        SET_ASSET: {
                                            actions: 'handleSetAsset',
                                            target: 'idle'
                                        }
                                    }
                                },
                                max: {
                                    entry: 'enterMax',
                                    on: {
                                        EXIT_MAX: {
                                            actions: 'exitMax',
                                            target: 'idle'
                                        },
                                        SET_AMOUNT_INPUT_TYPE: {
                                            actions: [
                                                'handleSetAmountInputType',
                                                'enterMax',
                                                'persistAmountInputType'
                                            ]
                                        },
                                        SET_ASSET: {
                                            actions: 'handleSetAsset',
                                            target: 'idle'
                                        },
                                        ENTER_MAX: {},
                                        SET_AMOUNT: [
                                            { guard: 'isAmountValueUnchanged' },
                                            {
                                                guard: 'isAmountValueEmpty',
                                                actions: 'exitMax',
                                                target: 'idle'
                                            },
                                            {
                                                actions: 'handleSetAmount',
                                                target: 'routing'
                                            }
                                        ],
                                        NEXT: {
                                            guard: 'isAmountStepValid',
                                            target: '#sendForm.submitted'
                                        }
                                    }
                                },
                                routing: {
                                    always: [
                                        {
                                            guard: 'isAmountContextEmpty',
                                            target: 'idle'
                                        },
                                        {
                                            guard: 'isAmountStepValid',
                                            target: 'manual'
                                        },
                                        {
                                            target: 'invalid'
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },
                submitted: {
                    entry: 'callOnSubmit',
                    on: {
                        BACK_TO_EDITING: {
                            target: 'editing.amount'
                        }
                    },
                    always: [
                        {
                            guard: 'shouldResetOnSubmit',
                            actions: 'resetAll',
                            target: 'editing.recipient.empty'
                        }
                    ]
                }
            }
        });
