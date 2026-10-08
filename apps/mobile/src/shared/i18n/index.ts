import { getLocales } from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { FALLBACK_LANGUAGE, translations } from '@safely/ux/translations';

// eslint-disable-next-line boundaries/element-types
import { mobileLayerSynchronousLocale } from '@mobile/app/storage';

/* The strings themselves live in @safely/ux — shared with the web targets. Only the
   i18next instance and the language detection are platform-specific. */
const detectedLanguage =
    mobileLayerSynchronousLocale.storage.get() ?? getLocales()[0].languageCode ?? FALLBACK_LANGUAGE;

export const i18n = i18next.use(initReactI18next).init({
    lng: detectedLanguage,
    fallbackLng: FALLBACK_LANGUAGE,
    resources: translations,
    interpolation: { escapeValue: false },
    react: { transSupportBasicHtmlNodes: false }
});

export { availableLanguages, type LanguageCode } from '@safely/ux/translations';

export default i18n;
