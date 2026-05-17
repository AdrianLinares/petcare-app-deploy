import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PetOwnerDashboard from "@/components/Dashboard/PetOwnerDashboard";
import { __TESTING__ } from "react-i18next";

// Mock API modules
vi.mock("@/lib/api", () => ({
  petAPI: {
    getPets: vi.fn().mockResolvedValue([]),
  },
  appointmentAPI: {
    getAppointments: vi.fn().mockResolvedValue([]),
  },
  vaccinationAPI: {
    getUpcoming: vi.fn().mockResolvedValue([]),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock child components to isolate dashboard translation testing
vi.mock("@/components/Pet/PetManagement", () => ({
  default: () => <div data-testid="pet-management">PetManagement</div>,
}));

vi.mock("@/components/Appointment/AppointmentScheduling", () => ({
  default: () => <div data-testid="appointment-scheduling">AppointmentScheduling</div>,
}));

vi.mock("@/components/Medical/PetMedicalRecords", () => ({
  default: () => <div data-testid="medical-records">PetMedicalRecords</div>,
}));

vi.mock("@/components/Notification/NotificationBell", () => ({
  default: () => <div data-testid="notification-bell">NotificationBell</div>,
}));

vi.mock("@/components/LanguageSwitcher", () => ({
  default: () => <div data-testid="language-switcher">LanguageSwitcher</div>,
}));

const mockUser = {
  id: "user-1",
  email: "owner@test.com",
  fullName: "John Doe",
  userType: "pet_owner" as const,
};

describe("PetOwnerDashboard — translated strings", () => {
  const onLogout = vi.fn();

  beforeEach(() => {
    __TESTING__.setLanguage("en");
    vi.clearAllMocks();
  });

  const renderDashboard = () =>
    render(<PetOwnerDashboard user={mockUser} onLogout={onLogout} />);

  it("renders the welcome message via translation key", () => {
    renderDashboard();
    expect(
      screen.getByText("[en] dashboard.welcome", { exact: false })
    ).toBeInTheDocument();
  });

  it("renders the 'Sign Out' button via translation key", () => {
    renderDashboard();
    expect(screen.getByText("[en] dashboard.signOut")).toBeInTheDocument();
  });

  it("renders the Overview tab via translation key", () => {
    renderDashboard();
    expect(screen.getByText("[en] dashboard.overview")).toBeInTheDocument();
  });

  it("renders the My Pets tab via translation key", () => {
    renderDashboard();
    const myPetsElements = screen.getAllByText("[en] dashboard.myPets");
    expect(myPetsElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the Appointments tab via translation key", () => {
    renderDashboard();
    expect(screen.getByText("[en] dashboard.appointments")).toBeInTheDocument();
  });

  it("renders the Medical Records tab via translation key", () => {
    renderDashboard();
    expect(screen.getByText("[en] dashboard.medicalRecords")).toBeInTheDocument();
  });

  it("renders stat card labels via translation keys", async () => {
    renderDashboard();
    const myPetsElements = screen.getAllByText("[en] dashboard.myPets");
    expect(myPetsElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("[en] dashboard.upcoming")).toBeInTheDocument();
    expect(screen.getByText("[en] dashboard.completed")).toBeInTheDocument();
    expect(screen.getByText("[en] dashboard.overdueVaccines")).toBeInTheDocument();
  });

  it("renders the Upcoming Appointments section title via translation key", async () => {
    renderDashboard();
    expect(
      screen.getByText("[en] dashboard.upcomingAppointments")
    ).toBeInTheDocument();
  });

  it("renders the Schedule New button via translation key", async () => {
    renderDashboard();
    expect(screen.getByText("[en] dashboard.scheduleNew")).toBeInTheDocument();
  });

  it("renders the no upcoming appointments empty state via translation key", async () => {
    renderDashboard();
    expect(
      screen.getByText("[en] dashboard.noUpcomingAppointments")
    ).toBeInTheDocument();
  });

  it("renders the Recent Medical History title via translation key", async () => {
    renderDashboard();
    expect(
      screen.getByText("[en] dashboard.recentMedicalHistory")
    ).toBeInTheDocument();
  });

  it("renders the no medical history empty state via translation key", async () => {
    renderDashboard();
    expect(
      screen.getByText("[en] dashboard.noMedicalHistory")
    ).toBeInTheDocument();
  });
});
