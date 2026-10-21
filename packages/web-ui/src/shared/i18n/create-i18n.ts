import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import type { ISyncKeyValueStorage } from '@safely/core';
import { FALLBACK_LANGUAGE, translations } from '@safely/ux/translations';

const LANGUAGE_KEY = 'language';

/** `en-GB` → `en`: the resource map is keyed by language, not by full locale. */
const toLanguage = (locale: string): string => locale.split('-')[0];

/** Created before React mounts — the very first config request already carries the language. */
export function createWebI18n(options: {
    storage: ISyncKeyValueStorage;
    /** OS locale, used until the user picks a language */
    fallbackLocale: string;
}) {
    const stored = options.storage.get(LANGUAGE_KEY);
    const instance = i18next.createInstance();

    void instance.use(initReactI18next).init({
        lng: stored ?? toLanguage(options.fallbackLocale),
        fallbackLng: FALLBACK_LANGUAGE,
        resources: translations,
        interpolation: { escapeValue: false },
        react: { transSupportBasicHtmlNodes: false }
    });

    instance.on('languageChanged', language => options.storage.set(LANGUAGE_KEY, language));

    return { instance };
}
