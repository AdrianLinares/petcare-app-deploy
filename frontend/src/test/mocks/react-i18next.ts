const createMockT = (language: string) => (key: string) => `[${language}] ${key}`;

const i18nMock = {
  language: "en",
  changeLanguage: async (nextLanguage: string) => {
    i18nMock.language = nextLanguage;
    return i18nMock;
  },
};

export const useTranslation = () => ({
  t: createMockT(i18nMock.language),
  i18n: i18nMock,
});

export const initReactI18next = {};

export const __TESTING__ = {
  i18nMock,
  setLanguage(language: string) {
    i18nMock.language = language;
  },
  createMockT,
};
