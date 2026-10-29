import { useMemo } from 'react';
import type { SnapshotFrom } from 'xstate';

import { assertUnreachable } from '@safely/core';

import type { createSendFormMachine } from '../machine/machine';
import type { SendSuggestions } from '../types';
import {
    SEND_FORM_FEATURES_BY_CHAIN,
    computeRecipientMeta,
    filterSuggestionsByQuery
} from '../utils';
import type { AmountView, RecipientView, SendFormView } from '../view';
import type { SendFormDispatchers } from './useSendFormDispatchers';

type Snapshot = SnapshotFrom<ReturnType<typeof createSendFormMachine>>;

interface UseSendFormViewProps {
    snapshot: Snapshot;
    dispatchers: SendFormDispatchers;
}

function filterAndOrderByIds<S extends { id: string }>(items: S[], ids: string[]): S[] {
    if (ids.length === 0) return [];

    const idSet = new Set(ids);

    return items.filter(s => idSet.has(s.id)).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
}

function resolveRecipientStatus(snapshot: Snapshot): RecipientView['status'] {
    if (snapshot.matches({ editing: { recipient: 'valid' } })) return 'valid';
    if (snapshot.matches({ editing: { recipient: 'selfTransfer' } })) return 'selfTransfer';
    if (snapshot.matches({ editing: { recipient: 'invalid' } })) return 'invalid';

    return 'empty';
}

function resolveAmountStatus(snapshot: Snapshot): AmountView['status'] {
    if (snapshot.matches({ editing: { amount: 'max' } })) return 'max';
    if (snapshot.matches({ editing: { amount: 'manual' } })) return 'manual';
    if (snapshot.matches({ editing: { amount: 'invalid' } })) return 'invalid';

    return 'idle';
}

export function useSendFormView(props: UseSendFormViewProps): SendFormView {
    const { snapshot, dispatchers } = props;

    const {
        setRecipient,
        setAddressBookName,
        setAmount,
        pasteAmount,
        setAmountInputType,
        setAsset,
        setMemo,
        enterMax,
        exitMax,
        selectSuggestion,
        goPrev,
        goNext,
        backToEditing
    } = dispatchers;

    const fromMeta = snapshot.context.activeWallet.meta;
    const ratedAssets = snapshot.context.ratedAssets;
    const contactSuggestions = snapshot.context.contactSuggestions;
    const portfolioSuggestions = snapshot.context.portfolioSuggestions;

    const visibleSuggestions = useMemo<SendSuggestions>(
        () =>
            filterSuggestionsByQuery(
                {
                    portfolios: portfolioSuggestions,
                    contacts: contactSuggestions
                },
                snapshot.context.values.recipient
            ),
        [portfolioSuggestions, contactSuggestions, snapshot.context.values.recipient]
    );

    const selectedSuggestionId = snapshot.context.suggestion.selectedId;
    const selectedSuggestionSource = snapshot.context.suggestion.source;
    const portfoliosSuggestionIds = snapshot.context.suggestion.portfoliosIds;
    const contactsSuggestionIds = snapshot.context.suggestion.contactsIds;

    const restoredSuggestions = useMemo<SendSuggestions | undefined>(() => {
        if (!selectedSuggestionId) return undefined;
        if (!portfoliosSuggestionIds && !contactsSuggestionIds) return undefined;

        return {
            portfolios: filterAndOrderByIds(portfolioSuggestions, portfoliosSuggestionIds ?? []),
            contacts: filterAndOrderByIds(contactSuggestions, contactsSuggestionIds ?? [])
        };
    }, [
        selectedSuggestionId,
        portfoliosSuggestionIds,
        contactsSuggestionIds,
        portfolioSuggestions,
        contactSuggestions
    ]);

    const recipientMeta = useMemo(
        () => computeRecipientMeta(selectedSuggestionId, portfolioSuggestions, contactSuggestions),
        [selectedSuggestionId, portfolioSuggestions, contactSuggestions]
    );

    const recipientBlockchain = snapshot.context.parsed.recipient?.blockchain;
    const availableAssets = useMemo(() => {
        if (!recipientBlockchain) return [];

        return ratedAssets
            .map(ratedAsset => ratedAsset.amount)
            .filter(({ asset }) => asset.id.blockchain === recipientBlockchain);
    }, [ratedAssets, recipientBlockchain]);

    const stateValue = snapshot.value;
    const ctxValues = snapshot.context.values;
    const ctxErrors = snapshot.context.errors;
    const ctxParsedRecipient = snapshot.context.parsed.recipient;
    const ctxParsedAmount = snapshot.context.parsed.amount;
    const ctxParsedAsset = snapshot.context.parsed.asset;
    const ctxParsedMaxValue = snapshot.context.parsed.maxValue;
    const recipientFeatures =
        recipientBlockchain && SEND_FORM_FEATURES_BY_CHAIN[recipientBlockchain];
    const memoSetter = recipientFeatures?.hasMemo ? setMemo : undefined;
    const nextIfMemoValid = ctxErrors.memo ? undefined : goNext;

    return useMemo<SendFormView>(() => {
        if (snapshot.matches('restoring')) return { state: 'restoring' };
        if (snapshot.matches('submitted')) return { state: 'submitted', backToEditing };
        if (snapshot.matches({ editing: { recipient: 'creatingContact' } })) {
            return { state: 'creatingContact' };
        }

        if (snapshot.matches({ editing: 'recipient' })) {
            const status = resolveRecipientStatus(snapshot);
            const base = {
                state: 'recipient' as const,
                values: {
                    recipient: ctxValues.recipient,
                    addressBookName: ctxValues.addressBookName
                },
                errors: { recipient: ctxErrors.recipient },
                suggestions: visibleSuggestions,
                restoredSuggestions,
                selectedSuggestionId,
                selectedSuggestionSource,
                fromMeta,
                canSaveContact: ctxParsedRecipient
                    ? SEND_FORM_FEATURES_BY_CHAIN[ctxParsedRecipient.blockchain].canSaveContact
                    : false,
                setRecipient,
                setAddressBookName,
                selectSuggestion
            };

            switch (status) {
                case 'valid':
                    return { ...base, status, next: goNext };
                case 'empty':
                case 'invalid':
                case 'selfTransfer':
                    return { ...base, status };
                default:
                    return assertUnreachable(status);
            }
        }

        if (snapshot.matches({ editing: 'amount' })) {
            if (!ctxParsedRecipient) return { state: 'restoring' };

            const status = resolveAmountStatus(snapshot);
            const isMaxAvailable = ctxParsedAsset
                ? !ctxParsedAsset.amount.relativeAmount.eq(0)
                : false;
            const base = {
                state: 'amount' as const,
                values: {
                    amount: ctxValues.amount,
                    assetId: ctxValues.assetId,
                    amountInputType: ctxValues.amountInputType,
                    memo: ctxValues.memo
                },
                errors: {
                    amount: ctxErrors.amount,
                    asset: ctxErrors.asset,
                    memo: ctxErrors.memo
                },
                parsed: {
                    recipient: ctxParsedRecipient,
                    amount: ctxParsedAmount,
                    asset: ctxParsedAsset
                },
                recipientMeta,
                fromMeta,
                availableAssets,
                isMaxAvailable,
                setAmount,
                pasteAmount,
                setAmountInputType,
                setAsset,
                setMemo: memoSetter,
                prev: goPrev
            };

            const canEnterMax =
                !!ctxParsedAsset && !!ctxParsedMaxValue && ctxParsedMaxValue.weiAmount > 0n;
            const enterMaxIfAvailable = canEnterMax ? enterMax : undefined;

            switch (status) {
                case 'manual':
                    return {
                        ...base,
                        status,
                        enterMax: enterMaxIfAvailable,
                        next: nextIfMemoValid
                    };
                case 'max':
                    return { ...base, status, exitMax, next: nextIfMemoValid };
                case 'idle':
                case 'invalid':
                    return { ...base, status, enterMax: enterMaxIfAvailable };
            }
        }

        return { state: 'restoring' };
    }, [
        stateValue,
        ctxValues,
        ctxErrors,
        ctxParsedRecipient,
        ctxParsedAmount,
        ctxParsedAsset,
        ctxParsedMaxValue,
        selectedSuggestionId,
        selectedSuggestionSource,
        visibleSuggestions,
        restoredSuggestions,
        recipientMeta,
        fromMeta,
        availableAssets,
        setRecipient,
        setAddressBookName,
        selectSuggestion,
        setAmount,
        pasteAmount,
        setAmountInputType,
        setAsset,
        memoSetter,
        nextIfMemoValid,
        enterMax,
        exitMax,
        goPrev,
        goNext,
        backToEditing
    ]);
}
