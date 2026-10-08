import en from './en.json';
import ru from './ru.json';

/** Shared by every app; each one creates its own i18next instance. `en.json` is the source. */
export const translations = {
    en: { translation: en },
    ru: { translation: ru }
};

export type LanguageCode = keyof typeof translations;

export const FALLBACK_LANGUAGE: LanguageCode = 'en';

export const availableLanguages = (Object.keys(translations) as LanguageCode[]).map(code => ({
    code,
    nativeName: translations[code].translation.currentLanguageName
}));
