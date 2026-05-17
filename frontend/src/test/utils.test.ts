import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn() - Fusion de clases CSS", () => {
    it("combina multiples clases", () => {
        expect(cn("flex", "gap-4", "p-2")).toBe("flex gap-4 p-2");
    });

    it("maneja valores falsy (undefined, null, false)", () => {
        expect(cn("btn", undefined, null, false, "active")).toBe("btn active");
    });

    it("resuelve conflictos de Tailwind (ultima clase gana)", () => {
        expect(cn("p-2", "p-4")).toBe("p-4");
        expect(cn("text-red-500", "text-blue-600")).toBe("text-blue-600");
    });

    it("soporta objetos condicionales", () => {
        const active = true;
        expect(cn("btn", { "btn-active": active, "btn-disabled": !active })).toBe("btn btn-active");
    });
});
