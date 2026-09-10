import { createInstance, type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@assets/locales/en.json';
import sr from '@assets/locales/sr.json';

declare global {
    var __blueStarsI18n: I18nInstance | undefined;
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

export default i18n;
