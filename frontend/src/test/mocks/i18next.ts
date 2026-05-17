type InitConfig = {
    lng: string;
    resources: Record<string, { translation: Record<string, string> }>;
};

const i18n = {
    language: "en",
    resources: {} as InitConfig["resources"],
    use() {
        return i18n;
    },
    init(config: InitConfig) {
        i18n.language = config.lng;
        i18n.resources = config.resources;
        return Promise.resolve(i18n);
    },
    t(key: string) {
        const parts = key.split(".");
        const translation = parts.reduce<Record<string, unknown> | string | undefined>((acc, part) => {
            if (!acc || typeof acc === "string") {
                return undefined;
            }
            return acc[part] as Record<string, unknown> | string | undefined;
        }, i18n.resources[i18n.language]?.translation);

        return typeof translation === "string" ? translation : key;
    },
};

export default i18n;
