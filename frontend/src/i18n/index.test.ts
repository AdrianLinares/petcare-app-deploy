import { beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "petcare:lang";

const setNavigatorLanguage = (value: string) => {
    Object.defineProperty(window.navigator, "language", {
        value,
        configurable: true,
    });
};

describe("i18n initialization", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.resetModules();
    });

    it("prefers stored language over navigator", async () => {
        localStorage.setItem(STORAGE_KEY, "es");
        setNavigatorLanguage("en-US");

        const { i18n, initPromise } = await import("./index");

        await initPromise;

        expect(i18n.language).toBe("es");
        expect(i18n.t("app.title")).toBe("PetCare");
        expect(i18n.t("auth.login")).toBe("Iniciar sesión");
    });

    it("falls back to English when stored language is unsupported", async () => {
        localStorage.setItem(STORAGE_KEY, "fr");
        setNavigatorLanguage("fr-FR");

        const { i18n, initPromise } = await import("./index");

        await initPromise;

        expect(i18n.language).toBe("en");
        expect(i18n.t("app.title")).toBe("PetCare");
        expect(i18n.t("auth.login")).toBe("Login");
    });
});
