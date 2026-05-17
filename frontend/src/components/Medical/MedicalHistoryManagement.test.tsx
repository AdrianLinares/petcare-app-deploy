import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MedicalHistoryManagement from "@/components/Medical/MedicalHistoryManagement";
import { __TESTING__ } from "react-i18next";

// Mock API modules
vi.mock("@/lib/api", () => ({
  petAPI: {
    updatePet: vi.fn().mockResolvedValue({}),
  },
  medicalRecordAPI: {
    getByPet: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
  vaccinationAPI: {
    getByPet: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
  medicationAPI: {
    getByPet: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockPet = {
  id: "pet-1",
  name: "Buddy",
  species: "Dog",
  breed: "Golden Retriever",
  age: 3,
  weight: 25.5,
  ownerId: "owner-1",
  allergies: [] as string[],
  notes: "",
  color: "Golden",
  gender: "Male" as const,
};

describe("MedicalHistoryManagement — translated strings", () => {
  const onUpdate = vi.fn();

  beforeEach(() => {
    __TESTING__.setLanguage("en");
    vi.clearAllMocks();
  });

  const renderComponent = (canEdit = true) =>
    render(
      <MedicalHistoryManagement
        pet={mockPet}
        onUpdate={onUpdate}
        canEdit={canEdit}
      />
    );

  // Tab labels
  it("renders the Medical History tab via translation key", () => {
    renderComponent();
    const elements = screen.getAllByText("[en] medical.medicalHistory", { exact: false });
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the Vaccinations tab via translation key", () => {
    renderComponent();
    const elements = screen.getAllByText("[en] medical.vaccinations", { exact: false });
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the Medications tab via translation key", () => {
    renderComponent();
    const elements = screen.getAllByText("[en] medical.medications", { exact: false });
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  // Section headers (quick info cards)
  it("renders the Allergies card header via translation key", () => {
    renderComponent();
    expect(screen.getByText("[en] medical.allergies")).toBeInTheDocument();
  });

  it("renders the Weight card header via translation key", () => {
    renderComponent();
    expect(screen.getByText("[en] medical.weight")).toBeInTheDocument();
  });

  it("renders the Notes card header via translation key", () => {
    renderComponent();
    expect(screen.getByText("[en] medical.notes")).toBeInTheDocument();
  });

  // Empty state — the medical history tab is active by default
  it("renders no medical history empty state via translation key", async () => {
    renderComponent();
    const emptyState = await screen.findByText("[en] medical.noMedicalHistory");
    expect(emptyState).toBeInTheDocument();
  });

  // Card title headers within the active medical tab
  it("renders the Medical History card title via translation key", () => {
    renderComponent();
    const titles = screen.getAllByText("[en] medical.medicalHistory", { exact: false });
    expect(titles.length).toBeGreaterThanOrEqual(2);
  });

  // Buttons
  it("renders the Refresh button via translation key", () => {
    renderComponent();
    expect(screen.getByText("[en] medical.refresh")).toBeInTheDocument();
  });

  it("renders the Add Record button via translation key", () => {
    renderComponent();
    expect(screen.getByText("[en] medical.addRecord")).toBeInTheDocument();
  });

  // Data labels — use exact:false because they share <p> with dynamic values
  it("renders the Age label via translation key", () => {
    renderComponent();
    expect(
      screen.getByText("[en] medical.age", { exact: false })
    ).toBeInTheDocument();
  });

  it("renders the Owner label via translation key", () => {
    renderComponent();
    expect(
      screen.getByText("[en] medical.owner", { exact: false })
    ).toBeInTheDocument();
  });

  it("renders the 'No notes' text via translation key", () => {
    renderComponent();
    expect(screen.getByText("[en] medical.noNotes")).toBeInTheDocument();
  });

  // Dynamic data — must NOT be wrapped in t(), appears as raw text
  it("renders the pet name as raw data (not a translation key)", () => {
    renderComponent();
    expect(screen.getByText("Buddy")).toBeInTheDocument();
  });

  it("renders the pet species and breed as raw data", () => {
    renderComponent();
    expect(screen.getByText("Dog", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Golden Retriever", { exact: false })).toBeInTheDocument();
  });

  it("renders the weight numeric value as raw data", () => {
    renderComponent();
    expect(screen.getByText("25.5", { exact: false })).toBeInTheDocument();
  });

  it("renders the kg unit via translation key", () => {
    renderComponent();
    expect(
      screen.getByText("[en] medical.kg", { exact: false })
    ).toBeInTheDocument();
  });
});
