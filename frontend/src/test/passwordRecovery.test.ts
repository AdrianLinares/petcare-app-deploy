import { beforeEach, describe, expect, it } from "vitest";
import {
    createPasswordResetToken,
    generateResetToken,
    markTokenAsUsed,
    validateResetToken,
} from "@/utils/passwordRecovery";

beforeEach(() => {
    localStorage.clear();
});

describe("generateResetToken", () => {
    it("genera token de 64 caracteres hexadecimales", () => {
        const token = generateResetToken();
        expect(token).toHaveLength(64);
        expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it("genera tokens unicos en cada llamada", () => {
        expect(generateResetToken()).not.toBe(generateResetToken());
    });
});

describe("validateResetToken", () => {
    it("valida token activo correctamente", () => {
        const created = createPasswordResetToken("user@test.com");
        const result = validateResetToken(created.token);

        expect(result).not.toBeNull();
        expect(result?.email).toBe("user@test.com");
    });

    it("rechaza token inexistente", () => {
        expect(validateResetToken("token_falso_123")).toBeNull();
    });

    it("rechaza token ya utilizado (one-time use)", () => {
        const { token } = createPasswordResetToken("x@x.com");
        markTokenAsUsed(token);

        expect(validateResetToken(token)).toBeNull();
    });

    it("mantiene un solo token activo por email", () => {
        const first = createPasswordResetToken("same@test.com");
        const second = createPasswordResetToken("same@test.com");

        expect(validateResetToken(first.token)).toBeNull();
        expect(validateResetToken(second.token)).not.toBeNull();
    });
});
