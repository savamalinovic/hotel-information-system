import { createInstance, type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@assets/locales/en.json';
import sr from '@assets/locales/sr.json';
import { asyncStorageService } from '../services/asyncStorageService';
import { ASYNC_STORAGE_KEYS } from '../util/secureStoreKeys';
import { createLanguagePreference } from './languagePreference';

declare global {
    var __blueStarsI18n: I18nInstance | undefined;
    var __blueStarsLanguagePreference: ReturnType<typeof createLanguagePreference> | undefined;
}

const resources = {
    en: { translation: en, },
    sr: { translation: sr, },
};

const i18n = globalThis.__blueStarsI18n ?? createInstance();

globalThis.__blueStarsI18n ??= i18n;

if (!i18n.isInitialized) {
    void i18n
        .use(initReactI18next)
        .init({
            compatibilityJSON: "v4",
            resources,
            lng: 'sr',
            fallbackLng: 'en',
            initImmediate: false,
            interpolation: {
                escapeValue: false
            }
        });
}

const languagePreference = globalThis.__blueStarsLanguagePreference ??= createLanguagePreference({
    read: () => asyncStorageService.getItemAsync(ASYNC_STORAGE_KEYS.languageKey),
    write: (language) => asyncStorageService.setItemAsync(ASYNC_STORAGE_KEYS.languageKey, language),
    apply: (language) => { void i18n.changeLanguage(language); },
});

void languagePreference.restore();

export const selectLanguage = languagePreference.select;
export default i18n;
