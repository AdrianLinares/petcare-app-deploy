import { describe, expect, it } from "vitest";
import type { User } from "@/types";
import { RoleManager } from "@/utils/roleManagement";

const buildUser = (overrides: Partial<User>): User => ({
    id: "id-1",
    email: "user@test.com",
    password: "secret",
    fullName: "Test User",
    phone: "3000000000",
    userType: "pet_owner",
    createdAt: new Date().toISOString(),
    ...overrides,
});

const superAdmin = buildUser({
    id: "1",
    userType: "administrator",
    accessLevel: "super_admin",
});

const petOwner = buildUser({
    id: "2",
    userType: "pet_owner",
});

const veterinarian = buildUser({
    id: "3",
    userType: "veterinarian",
});

describe("RoleManager - Permisos de pet_owner", () => {
    it("no puede crear usuarios", () => {
        expect(RoleManager.hasPermission(petOwner, "canCreateUsers")).toBe(false);
    });

    it("no tiene acceso al panel de admin", () => {
        expect(RoleManager.hasPermission(petOwner, "canAccessAdminPanel")).toBe(false);
    });

    it("no puede gestionar otros usuarios", () => {
        expect(RoleManager.canManageUser(petOwner, veterinarian)).toBe(false);
    });
});

describe("RoleManager - Super Admin", () => {
    it("puede gestionar cualquier usuario", () => {
        expect(RoleManager.canManageUser(superAdmin, petOwner)).toBe(true);
        expect(RoleManager.canManageUser(superAdmin, veterinarian)).toBe(true);
    });

    it("puede crear todos los tipos de usuario", () => {
        const creatable = RoleManager.getCreatableUserTypes(superAdmin);
        expect(creatable).toContain("administrator");
        expect(creatable).toContain("pet_owner");
        expect(creatable).toContain("veterinarian");
    });

    it("puede asignar rol de administrador con nivel super_admin", () => {
        expect(RoleManager.canAssignRole(superAdmin, "administrator", "super_admin")).toBe(true);
    });

    it("tiene acceso al dashboard de administración", () => {
        expect(RoleManager.canAccessAdminDashboard(superAdmin)).toBe(true);
    });

    it("incluye permisos críticos en el resumen", () => {
        const summary = RoleManager.getUserPermissionsSummary(superAdmin);
        expect(summary).toContain("Admin Panel Access");
        expect(summary).toContain("System Settings");
    });
});
