import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, act } from "@testing-library/react";
import LoginForm from "@/components/Auth/LoginForm";
import { __TESTING__ } from "react-i18next";

// Mock the auth API module
vi.mock("@/lib/api", () => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("LoginForm — translated strings", () => {
  const onLoginSuccess = vi.fn();
  const onSwitchToRegister = vi.fn();
  const onForgotPassword = vi.fn();

  beforeEach(() => {
    __TESTING__.setLanguage("en");
    vi.clearAllMocks();
  });

  const renderForm = () =>
    render(
      <LoginForm
        onLoginSuccess={onLoginSuccess}
        onSwitchToRegister={onSwitchToRegister}
        onForgotPassword={onForgotPassword}
      />
    );

  it("renders the login title via translation key when in login mode", () => {
    renderForm();
    expect(screen.getByText("[en] auth.loginTitle")).toBeInTheDocument();
  });

  it("renders the login subtitle via translation key", () => {
    renderForm();
    expect(screen.getByText("[en] auth.loginSubtitle")).toBeInTheDocument();
  });

  it("renders the email label via translation key", () => {
    renderForm();
    expect(screen.getByText("[en] auth.email")).toBeInTheDocument();
  });

  it("renders the password label via translation key", () => {
    renderForm();
    expect(screen.getByText("[en] auth.password")).toBeInTheDocument();
  });

  it("renders the sign-in button via translation key", () => {
    renderForm();
    expect(
      screen.getByRole("button", { name: "[en] auth.signIn" })
    ).toBeInTheDocument();
  });

  it("renders the forgot-password link via translation key", () => {
    renderForm();
    expect(screen.getByText("[en] auth.forgotPassword")).toBeInTheDocument();
  });

  it("renders the no-account link via translation key", () => {
    renderForm();
    expect(screen.getByText("[en] auth.noAccount")).toBeInTheDocument();
  });

  it("renders register title when toggled to register mode", async () => {
    renderForm();
    // Click "Don't have an account? Sign up" → switches to register
    const toggleBtn = screen.getByText("[en] auth.noAccount");
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    expect(screen.getByText("[en] auth.registerTitle")).toBeInTheDocument();
  });

  it("renders password placeholder via translation key", () => {
    renderForm();
    expect(
      screen.getByPlaceholderText("[en] auth.passwordPlaceholder")
    ).toBeInTheDocument();
  });
});
