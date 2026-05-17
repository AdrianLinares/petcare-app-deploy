import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ResetPasswordForm from "@/components/Auth/ResetPasswordForm";
import { getResetTokenFromURL } from "../../utils/passwordRecovery";
import { __TESTING__ } from "react-i18next";

// Mock the auth API module
vi.mock("@/lib/api", () => ({
  authAPI: {
    resetPassword: vi.fn(),
  },
}));

// Mock the password recovery utility
vi.mock("../../utils/passwordRecovery", () => ({
  getResetTokenFromURL: vi.fn().mockReturnValue("test-token-abc"),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ResetPasswordForm — translated strings", () => {
  const onSuccess = vi.fn();
  const onBack = vi.fn();

  beforeEach(() => {
    __TESTING__.setLanguage("en");
    vi.clearAllMocks();
    vi.mocked(getResetTokenFromURL).mockReturnValue("test-token-abc");
  });

  const renderForm = (token?: string) =>
    render(
      <ResetPasswordForm
        resetToken={token}
        onSuccess={onSuccess}
        onBack={onBack}
      />
    );

  it("renders the title via translation key", () => {
    renderForm("test-token-abc");
    expect(
      screen.getByText("[en] resetPassword.title")
    ).toBeInTheDocument();
  });

  it("renders the subtitle via translation key", () => {
    renderForm("test-token-abc");
    expect(
      screen.getByText("[en] resetPassword.subtitle")
    ).toBeInTheDocument();
  });

  it("renders the new password label via translation key", () => {
    renderForm("test-token-abc");
    expect(
      screen.getByText("[en] resetPassword.newPassword")
    ).toBeInTheDocument();
  });

  it("renders the confirm password label via translation key", () => {
    renderForm("test-token-abc");
    expect(
      screen.getByText("[en] resetPassword.confirmPassword")
    ).toBeInTheDocument();
  });

  it("renders the update-password button via translation key", () => {
    renderForm("test-token-abc");
    expect(
      screen.getByRole("button", { name: "[en] resetPassword.updateButton" })
    ).toBeInTheDocument();
  });

  it("renders the back-to-login button via translation key", () => {
    renderForm("test-token-abc");
    expect(
      screen.getByRole("button", { name: "[en] resetPassword.backToLogin" })
    ).toBeInTheDocument();
  });

  it("renders the password requirements label via translation key", () => {
    renderForm("test-token-abc");
    expect(
      screen.getByText("[en] resetPassword.requirements")
    ).toBeInTheDocument();
  });

  it("renders the password placeholder via translation key", () => {
    renderForm("test-token-abc");
    expect(
      screen.getByPlaceholderText("[en] resetPassword.newPasswordPlaceholder")
    ).toBeInTheDocument();
  });

  it("shows invalid-link view when no token is available", () => {
    vi.mocked(getResetTokenFromURL).mockReturnValue(null);
    render(
      <ResetPasswordForm
        resetToken={undefined}
        onSuccess={onSuccess}
        onBack={onBack}
      />
    );
    expect(
      screen.getByText("[en] resetPassword.invalidLink")
    ).toBeInTheDocument();
  });
});
