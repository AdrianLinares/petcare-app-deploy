import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { __TESTING__ } from "react-i18next";

const STORAGE_KEY = "petcare:lang";

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    localStorage.clear();
    __TESTING__.setLanguage("en");
  });

  it("renders the language label and current language selection", () => {
    render(<LanguageSwitcher />);

    expect(screen.getByLabelText("Change language")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("en");
  });

  it("updates localStorage and i18n when selection changes", () => {
    const changeLanguageSpy = vi.spyOn(__TESTING__.i18nMock, "changeLanguage");

    render(<LanguageSwitcher />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "es" } });

    expect(localStorage.getItem(STORAGE_KEY)).toBe("es");
    expect(changeLanguageSpy).toHaveBeenCalledWith("es");
  });

  it("supports keyboard navigation and updates selection", () => {
    render(<LanguageSwitcher />);

    const select = screen.getByRole("combobox");
    select.focus();
    fireEvent.keyDown(select, { key: "ArrowDown" });
    fireEvent.change(select, { target: { value: "es" } });

    expect(select).toHaveValue("es");
  });
});
