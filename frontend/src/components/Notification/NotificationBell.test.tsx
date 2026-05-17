import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotificationBell from "@/components/Notification/NotificationBell";
import { __TESTING__ } from "react-i18next";

// Mock the notification API
vi.mock("@/lib/api", () => ({
  notificationAPI: {
    getNotifications: vi.fn().mockResolvedValue([]),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
  },
}));

// Mock the Pusher hook
vi.mock("@/hooks/use-pusher", () => ({
  usePusher: () => ({
    onNotificationReceived: vi.fn().mockReturnValue(vi.fn()),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("NotificationBell — translated strings", () => {
  beforeEach(() => {
    __TESTING__.setLanguage("en");
    vi.clearAllMocks();
  });

  const renderBell = () =>
    render(<NotificationBell userId="user-1" />);

  it("renders translated notification title and empty state when opened", async () => {
    renderBell();
    const bellBtn = screen.getByRole("button");
    expect(bellBtn).toBeInTheDocument();

    // Open the dropdown
    await userEvent.click(bellBtn);

    // The dropdown renders translated keys via the mock (prefix format: [en] key)
    await waitFor(() => {
      expect(screen.getByText("[en] notification.title")).toBeInTheDocument();
    });

    // After loading resolves (mock returns []), empty state appears
    await waitFor(() => {
      expect(screen.getByText("[en] notification.empty")).toBeInTheDocument();
    });
  });
});
