import type { SendSuggestions } from '../types';

export interface ResolveVisibleSuggestionsParams {
    suggestions: SendSuggestions;
    restoredSuggestions: SendSuggestions | undefined;
    selectedSuggestionId: string | undefined;
}

export function resolveVisibleSuggestions(
    params: ResolveVisibleSuggestionsParams
): SendSuggestions {
    const { suggestions, restoredSuggestions, selectedSuggestionId } = params;

    return selectedSuggestionId && restoredSuggestions ? restoredSuggestions : suggestions;
}

export function hasSuggestionMatches(suggestions: SendSuggestions): boolean {
    return suggestions.portfolios.length > 0 || suggestions.contacts.length > 0;
}
