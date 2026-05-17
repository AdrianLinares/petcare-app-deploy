import { describe, expect, it } from "vitest";
import { translateApiError } from "@/lib/api";

// Minimal t function mock: returns the key in brackets
const mockT = (key: string, options?: Record<string, unknown>) =>
  `[${key}]` + (options ? ` ${JSON.stringify(options)}` : "");

describe("translateApiError", () => {
  it("returns generic error key when error has no response data", () => {
    const error = { message: "Network Error" };
    const result = translateApiError(error, mockT);
    expect(result).toBe("[errors.generic]");
  });

  it("returns generic error key when error is null", () => {
    const result = translateApiError(null, mockT);
    expect(result).toBe("[errors.generic]");
  });

  it("returns generic error key when error is undefined", () => {
    const result = translateApiError(undefined, mockT);
    expect(result).toBe("[errors.generic]");
  });

  it("returns original server message when no mapping exists", () => {
    const error = {
      response: {
        data: { error: "Some random server error we haven't mapped" },
      },
    };
    const result = translateApiError(error, mockT);
    // Falls back to original server message since no mapping matches
    expect(result).toBe("Some random server error we haven't mapped");
  });

  it("returns mapped key for 'Invalid email or password' server message", () => {
    const error = {
      response: {
        data: { error: "Invalid email or password" },
      },
    };
    const result = translateApiError(error, mockT);
    expect(result).toBe("[api.invalidCredentials]");
  });

  it("returns mapped key for 'Token expired' server message", () => {
    const error = {
      response: {
        data: { error: "Token expired" },
      },
    };
    const result = translateApiError(error, mockT);
    expect(result).toBe("[api.tokenExpired]");
  });

  it("returns mapped key for 'User already exists' server message", () => {
    const error = {
      response: {
        data: { error: "User already exists" },
      },
    };
    const result = translateApiError(error, mockT);
    expect(result).toBe("[api.userAlreadyExists]");
  });

  it("returns mapped key for 'Email already registered' server message", () => {
    const error = {
      response: {
        data: { error: "Email already registered" },
      },
    };
    const result = translateApiError(error, mockT);
    expect(result).toBe("[api.emailAlreadyRegistered]");
  });

  it("returns mapped key for 'Not authorized' server message", () => {
    const error = {
      response: {
        data: { error: "Not authorized" },
      },
    };
    const result = translateApiError(error, mockT);
    expect(result).toBe("[api.notAuthorized]");
  });

  it("returns mapped key for 'Pet not found' server message", () => {
    const error = {
      response: {
        data: { error: "Pet not found" },
      },
    };
    const result = translateApiError(error, mockT);
    expect(result).toBe("[api.notFound]");
  });

  it("returns mapped key for 'Appointment not found' server message", () => {
    const error = {
      response: {
        data: { error: "Appointment not found" },
      },
    };
    const result = translateApiError(error, mockT);
    expect(result).toBe("[api.notFound]");
  });

  it("returns mapped key for 'User not found' server message", () => {
    const error = {
      response: {
        data: { error: "User not found" },
      },
    };
    const result = translateApiError(error, mockT);
    expect(result).toBe("[api.notFound]");
  });

  it("uses custom fallbackKey when provided and no mapping exists", () => {
    const error = { message: "Network Error" };
    const result = translateApiError(error, mockT, "appointment.failedSchedule");
    expect(result).toBe("[appointment.failedSchedule]");
  });

  it("still maps known errors even when fallbackKey is provided", () => {
    const error = {
      response: {
        data: { error: "Token expired" },
      },
    };
    const result = translateApiError(error, mockT, "errors.generic");
    expect(result).toBe("[api.tokenExpired]");
  });

  it("handles error.response.data.message format (alternative server format)", () => {
    const error = {
      response: {
        data: { message: "Invalid email or password" },
      },
    };
    const result = translateApiError(error, mockT);
    expect(result).toBe("[api.invalidCredentials]");
  });

  it("returns original server message when no mapping exists and no fallback", () => {
    const error = {
      response: {
        data: { error: "The vet is not available at that time" },
      },
    };
    const result = translateApiError(error, mockT);
    // Falls back to original server message since no mapping
    expect(result).toBe("The vet is not available at that time");
  });
});
