import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeLanguage, STORAGE_KEY, SUPPORTED_LANGUAGES } from "@/i18n";

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const storedLanguage = useMemo(
    () => normalizeLanguage(localStorage.getItem(STORAGE_KEY)),
    []
  );
  const initialLanguage = storedLanguage ?? normalizeLanguage(i18n.language) ?? "en";
  const [language, setLanguage] = useState(initialLanguage);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLanguage = event.target.value;

    localStorage.setItem(STORAGE_KEY, nextLanguage);
    setLanguage(nextLanguage);
    i18n.changeLanguage(nextLanguage);
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="language-switcher" className="sr-only">
        {t("language.label")}
      </label>
      <select
        id="language-switcher"
        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
        value={language}
        onChange={handleChange}
        aria-label="Change language"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {t(`language.${lang}`)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSwitcher;
