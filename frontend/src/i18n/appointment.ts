/**
 * Safe translation helpers for appointment types and statuses.
 *
 * Uses i18next t() calls with EXPLICIT known keys — no template literal
 * key construction — to avoid falling back to raw dotted key strings.
 */
import type { TFunction } from "i18next";

export const translateAppointmentType = (t: TFunction, type: string): string => {
  switch (type.toLowerCase().trim()) {
    case "checkup":       return t("appointment.types.checkup");
    case "vaccination":   return t("appointment.types.vaccination");
    case "emergency":     return t("appointment.types.emergency");
    case "surgery":       return t("appointment.types.surgery");
    case "dental":        return t("appointment.types.dental");
    case "grooming":      return t("appointment.types.grooming");
    case "followup":      return t("appointment.types.followup");
    case "consultation":  return t("appointment.types.consultation");
    default:              return type;  // unknown → show raw value
  }
};

export const translateAppointmentStatus = (t: TFunction, status: string): string => {
  switch (status.toLowerCase().trim()) {
    case "scheduled": return t("appointment.status.scheduled");
    case "completed": return t("appointment.status.completed");
    case "cancelled": return t("appointment.status.cancelled");
    default:          return status;
  }
};
