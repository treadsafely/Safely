import { useCallback } from 'react';

import type { SendSuggestions } from '@safely/ux';
import { resolveVisibleSuggestions } from '@safely/ux';

interface UseSuggestionSelectionParams {
    suggestions: SendSuggestions;
    restoredSuggestions?: SendSuggestions;
    selectedId?: string;
    onChangeText: (value: string, label?: string) => void;
    onSelectSuggestion: (id: string, visibleSuggestions: SendSuggestions) => void;
}

export function useSuggestionSelection(params: UseSuggestionSelectionParams) {
    const { suggestions, restoredSuggestions, selectedId, onChangeText, onSelectSuggestion } =
        params;

    const displaySuggestions = resolveVisibleSuggestions({
        suggestions,
        restoredSuggestions,
        selectedSuggestionId: selectedId
    });

    const handleSelect = useCallback(
        (id: string) => {
            onSelectSuggestion(id, displaySuggestions);
        },
        [onSelectSuggestion, displaySuggestions]
    );

    return {
        displaySuggestions,
        selectedId,
        handleSelect,
        handleChangeText: onChangeText
    };
}
