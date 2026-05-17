/**
 * Safe translation helpers for pet species and genders.
 *
 * Uses i18next t() calls with EXPLICIT known keys — no template literal
 * key construction — to avoid falling back to raw dotted key strings.
 */
import type { TFunction } from "i18next";

export const translateSpecies = (t: TFunction, species: string): string => {
  switch (species.toLowerCase().trim()) {
    case "dog":     return t("pets.dog");
    case "cat":     return t("pets.cat");
    case "bird":    return t("pets.bird");
    case "rabbit":  return t("pets.rabbit");
    case "hamster": return t("pets.hamster");
    case "fish":    return t("pets.fish");
    case "reptile": return t("pets.reptile");
    case "other":   return t("pets.other");
    default:        return species;
  }
};

export const translateGender = (t: TFunction, gender: string): string => {
  switch (gender.toLowerCase().trim()) {
    case "male":   return t("pets.male");
    case "female": return t("pets.female");
    default:       return gender;
  }
};
