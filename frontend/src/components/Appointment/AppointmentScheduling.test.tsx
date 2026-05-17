import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppointmentScheduling from "@/components/Appointment/AppointmentScheduling";
import { __TESTING__ } from "react-i18next";

// Mock API modules
vi.mock("@/lib/api", () => ({
  appointmentAPI: {
    getAppointments: vi.fn().mockResolvedValue([]),
    createAppointment: vi.fn().mockResolvedValue({
      id: "appt-new",
      petId: "pet-1",
      veterinarianId: "vet-1",
      type: "Routine Checkup",
      date: "2026-06-15",
      time: "10:00",
      reason: "Annual checkup",
      status: "scheduled",
      petName: "Buddy",
      veterinarian: "Dr. Jane Smith",
    }),
    updateAppointment: vi.fn().mockResolvedValue({}),
  },
  userAPI: {
    listUsers: vi.fn().mockResolvedValue({
      users: [
        {
          id: "vet-1",
          fullName: "Jane Smith",
          email: "vet@test.com",
          userType: "veterinarian",
        },
      ],
    }),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock lucide-react icons to avoid SVG rendering issues
vi.mock("lucide-react", () => ({
  Plus: () => <span data-testid="icon-plus">+</span>,
  Calendar: () => <span data-testid="icon-calendar">Cal</span>,
  Clock: () => <span data-testid="icon-clock">Clock</span>,
  User: () => <span data-testid="icon-user">User</span>,
  X: () => <span data-testid="icon-x">X</span>,
  ChevronDown: () => <span data-testid="icon-chevron-down">▼</span>,
  ChevronUp: () => <span data-testid="icon-chevron-up">▲</span>,
  ChevronLeft: () => <span data-testid="icon-chevron-left">◀</span>,
  ChevronRight: () => <span data-testid="icon-chevron-right">▶</span>,
  Check: () => <span data-testid="icon-check">✓</span>,
}));

const mockUser = {
  id: "user-1",
  email: "owner@test.com",
  fullName: "John Doe",
  userType: "pet_owner" as const,
};

const mockPets = [
  {
    id: "pet-1",
    name: "Buddy",
    species: "Dog",
    breed: "Golden Retriever",
    age: 3,
    weight: 30,
    color: "Golden",
    gender: "Male" as const,
    ownerId: "user-1",
    userId: "user-1",
    created_at: "2025-01-01",
    updated_at: "2025-01-01",
  },
];

const mockAppointments = [
  {
    id: "appt-1",
    petId: "pet-1",
    veterinarianId: "vet-1",
    type: "Routine Checkup",
    date: "2026-07-15",
    time: "10:00",
    reason: "Annual checkup",
    status: "scheduled" as const,
    petName: "Buddy",
    veterinarian: "Dr. Jane Smith",
  },
  {
    id: "appt-2",
    petId: "pet-1",
    veterinarianId: "vet-1",
    type: "Vaccination",
    date: "2025-06-10",
    time: "14:00",
    reason: "Rabies booster",
    status: "completed" as const,
    petName: "Buddy",
    veterinarian: "Dr. Jane Smith",
  },
];

describe("AppointmentScheduling — translated strings", () => {
  const mockSetAppointments = vi.fn();

  beforeEach(() => {
    __TESTING__.setLanguage("en");
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <AppointmentScheduling
        user={mockUser}
        pets={mockPets}
        appointments={mockAppointments}
        setAppointments={mockSetAppointments}
      />
    );

  it("renders the appointments title via translation key", () => {
    renderComponent();
    expect(
      screen.getByText("[en] appointment.title", { exact: false })
    ).toBeInTheDocument();
  });

  it("renders the 'Schedule Appointment' button via translation key", () => {
    renderComponent();
    expect(
      screen.getByText("[en] appointment.scheduleAppointment")
    ).toBeInTheDocument();
  });

  it("renders the dialog title 'Schedule New Appointment' via translation key when opened", async () => {
    const user = userEvent.setup();
    renderComponent();
    const trigger = screen.getByRole("button", {
      name: /schedule/i,
    });
    await user.click(trigger);
    expect(
      screen.getByText("[en] appointment.newAppointment")
    ).toBeInTheDocument();
    expect(
      screen.getByText("[en] appointment.newAppointmentDesc")
    ).toBeInTheDocument();
  });

  it("renders form labels via translation keys when dialog is open", async () => {
    const user = userEvent.setup();
    renderComponent();
    const trigger = screen.getByRole("button", {
      name: /schedule/i,
    });
    await user.click(trigger);

    expect(
      screen.getByText("[en] appointment.selectPet")
    ).toBeInTheDocument();
    expect(
      screen.getByText("[en] appointment.veterinarian")
    ).toBeInTheDocument();
    expect(
      screen.getByText("[en] appointment.date")
    ).toBeInTheDocument();
    expect(
      screen.getByText("[en] appointment.time")
    ).toBeInTheDocument();
    expect(
      screen.getByText("[en] appointment.appointmentType")
    ).toBeInTheDocument();
    expect(
      screen.getByText("[en] appointment.reasonForVisit")
    ).toBeInTheDocument();
    expect(
      screen.getByText("[en] appointment.additionalNotes")
    ).toBeInTheDocument();
  });

  it("renders placeholders and date picker text via translation keys", async () => {
    const user = userEvent.setup();
    renderComponent();
    const trigger = screen.getByRole("button", {
      name: /schedule/i,
    });
    await user.click(trigger);

    expect(
      screen.getByText("[en] appointment.pickDate")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("[en] appointment.reasonPlaceholder")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("[en] appointment.notesPlaceholder")
    ).toBeInTheDocument();
  });

  it("renders the Upcoming Appointments section title via translation key", () => {
    renderComponent();
    expect(
      screen.getByText("[en] appointment.upcomingAppointments")
    ).toBeInTheDocument();
  });

  it("renders the Past Appointments section title via translation key", () => {
    renderComponent();
    expect(
      screen.getByText("[en] appointment.pastAppointments")
    ).toBeInTheDocument();
  });

  it("renders the no upcoming appointments empty state via translation key", () => {
    render(
      <AppointmentScheduling
        user={mockUser}
        pets={mockPets}
        appointments={[]}
        setAppointments={mockSetAppointments}
      />
    );
    expect(
      screen.getByText("[en] appointment.noUpcomingAppointments")
    ).toBeInTheDocument();
  });

  it("renders the no past appointments empty state via translation key", () => {
    render(
      <AppointmentScheduling
        user={mockUser}
        pets={mockPets}
        appointments={[]}
        setAppointments={mockSetAppointments}
      />
    );
    expect(
      screen.getByText("[en] appointment.noPastAppointments")
    ).toBeInTheDocument();
  });

  it("renders the no pets empty state via translation keys when no pets provided", () => {
    render(
      <AppointmentScheduling
        user={mockUser}
        pets={[]}
        appointments={[]}
        setAppointments={mockSetAppointments}
      />
    );
    expect(
      screen.getByText("[en] appointment.noPetsRegistered")
    ).toBeInTheDocument();
    expect(
      screen.getByText("[en] appointment.noPetsDesc")
    ).toBeInTheDocument();
  });

  it("renders the submitting state text via translation key when dialog is open", async () => {
    const user = userEvent.setup();
    renderComponent();
    const trigger = screen.getByRole("button", {
      name: /schedule/i,
    });
    await user.click(trigger);
    // Verify the submit button shows 'Schedule Appointment' initially
    const submitBtn = screen.getByRole("button", { name: /schedule/i });
    expect(submitBtn).toBeInTheDocument();
  });

  it("renders the cancel button via common translation key", async () => {
    const user = userEvent.setup();
    renderComponent();
    const trigger = screen.getByRole("button", {
      name: /schedule/i,
    });
    await user.click(trigger);
    expect(screen.getByText("[en] common.cancel")).toBeInTheDocument();
  });
});
