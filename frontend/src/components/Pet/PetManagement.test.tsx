import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PetManagement from "@/components/Pet/PetManagement";
import { __TESTING__ } from "react-i18next";

// Mock the pet API module
vi.mock("@/lib/api", () => ({
  petAPI: {
    createPet: vi.fn(),
    updatePet: vi.fn(),
    deletePet: vi.fn(),
    getPets: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockPets = [
  {
    id: "pet-1",
    name: "Buddy",
    species: "dog",
    breed: "Golden Retriever",
    age: 3,
    weight: 25.5,
    color: "Golden",
    gender: "Male" as const,
    notes: "Very friendly",
    ownerId: "user-1",
    conditions: "",
    medicalHistory: [],
    vaccinations: [],
    medications: [],
    allergies: [],
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  },
];

const mockUser = {
  id: "user-1",
  email: "owner@test.com",
  fullName: "Test Owner",
  userType: "pet_owner" as const,
};

describe("PetManagement — translated strings", () => {
  const setPets = vi.fn();

  beforeEach(() => {
    __TESTING__.setLanguage("en");
    vi.clearAllMocks();
  });

  const renderComponent = (pets = mockPets) =>
    render(<PetManagement user={mockUser} pets={pets} setPets={setPets} />);

  it("renders the 'My Pets' title via translation key", () => {
    renderComponent();
    expect(screen.getByText("[en] pets.title")).toBeInTheDocument();
  });

  it("renders the 'Add Pet' button via translation key", () => {
    renderComponent();
    expect(screen.getByText("[en] pets.addPet")).toBeInTheDocument();
  });

  it("renders empty state title when no pets exist", () => {
    renderComponent([]);
    expect(screen.getByText("[en] pets.noPetsRegistered")).toBeInTheDocument();
  });

  it("renders empty state description via translation key", () => {
    renderComponent([]);
    expect(screen.getByText("[en] pets.addFirstPet")).toBeInTheDocument();
  });

  it("renders 'Add Your First Pet' button via translation key on empty state", () => {
    renderComponent([]);
    expect(screen.getByText("[en] pets.addYourFirstPet")).toBeInTheDocument();
  });

  it("renders pet card labels via translation keys (species, breed, age, weight, gender)", () => {
    renderComponent();
    expect(screen.getByText("[en] pets.speciesDisplay")).toBeInTheDocument();
    expect(screen.getByText("[en] pets.breedDisplay")).toBeInTheDocument();
    expect(screen.getByText("[en] pets.ageDisplay")).toBeInTheDocument();
    expect(screen.getByText("[en] pets.weightDisplay")).toBeInTheDocument();
    expect(screen.getByText("[en] pets.genderDisplay")).toBeInTheDocument();
  });

  it("renders the 'Notes' label via translation key when pet has notes", () => {
    renderComponent();
    expect(screen.getByText("[en] pets.notesDisplay")).toBeInTheDocument();
  });

  it("renders pet age with translated unit", () => {
    renderComponent();
    expect(screen.getByText("[en] pets.years", { exact: false })).toBeInTheDocument();
  });

  it("renders pet weight with translated unit", () => {
    renderComponent();
    expect(screen.getByText("[en] pets.kg", { exact: false })).toBeInTheDocument();
  });
});
