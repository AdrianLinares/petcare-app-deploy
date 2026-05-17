import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ForgotPasswordForm from "@/components/Auth/ForgotPasswordForm";
import { __TESTING__ } from "react-i18next";

// Mock the auth API module
vi.mock("@/lib/api", () => ({
  authAPI: {
    forgotPassword: vi.fn().mockResolvedValue({
      message: "If that email exists, a password reset link has been sent.",
    }),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ForgotPasswordForm — translated strings", () => {
  const onBack = vi.fn();

  beforeEach(() => {
    __TESTING__.setLanguage("en");
    vi.clearAllMocks();
  });

  const renderForm = () =>
    render(<ForgotPasswordForm onBack={onBack} />);

  it("renders the forgot-password title via translation key", () => {
    renderForm();
    expect(
      screen.getByText("[en] forgotPassword.title")
    ).toBeInTheDocument();
  });

  it("renders the subtitle via translation key", () => {
    renderForm();
    expect(
      screen.getByText("[en] forgotPassword.subtitle")
    ).toBeInTheDocument();
  });

  it("renders the email label via translation key", () => {
    renderForm();
    expect(
      screen.getByText("[en] forgotPassword.emailLabel")
    ).toBeInTheDocument();
  });

  it("renders the send-reset-link button via translation key", () => {
    renderForm();
    expect(
      screen.getByRole("button", { name: "[en] forgotPassword.sendLink" })
    ).toBeInTheDocument();
  });

  it("renders the back-to-login button via translation key", () => {
    renderForm();
    expect(
      screen.getByRole("button", { name: "[en] forgotPassword.backToLogin" })
    ).toBeInTheDocument();
  });

  it("renders the email placeholder via translation key", () => {
    renderForm();
    expect(
      screen.getByPlaceholderText("[en] forgotPassword.emailPlaceholder")
    ).toBeInTheDocument();
  });
});
