import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";
import es from "../locales/es.json";

const STORAGE_KEY = "petcare:lang";
const SUPPORTED_LANGUAGES = ["en", "es"] as const;

const normalizeLanguage = (value: string | null | undefined) => {
    if (!value) {
        return undefined;
    }

    const normalized = value.toLowerCase();
    const base = normalized.split("-")[0];

    return SUPPORTED_LANGUAGES.includes(base as (typeof SUPPORTED_LANGUAGES)[number])
        ? base
        : undefined;
};

const storedLanguage = normalizeLanguage(localStorage.getItem(STORAGE_KEY));
const navigatorLanguage = normalizeLanguage(navigator.language);
const initialLanguage = storedLanguage ?? navigatorLanguage ?? "en";

export const initPromise = i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            es: { translation: es },
        },
        lng: initialLanguage,
        fallbackLng: "en",
        supportedLngs: SUPPORTED_LANGUAGES,
        detection: {
            order: ["localStorage", "navigator"],
            lookupLocalStorage: STORAGE_KEY,
        },
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

export { i18n, STORAGE_KEY, SUPPORTED_LANGUAGES, normalizeLanguage };
