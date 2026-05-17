/**
 * User Form Validation Schema
 * 
 * BEGINNER EXPLANATION:
 * This file defines the rules for validating user input in forms.
 * It uses Zod, a TypeScript-first validation library.
 * 
 * What is Zod?
 * Zod lets you define schemas (rules) for data validation:
 * - Type checking (is it a string? number?)
 * - Format validation (is it a valid email?)
 * - Length constraints (min/max characters)
 * - Custom rules (regex patterns, custom logic)
 * 
 * Why Validate?
 * 1. Security: Prevent malicious input
 * 2. Data Quality: Ensure data is in correct format
 * 3. User Experience: Show helpful error messages
 * 4. Type Safety: TypeScript knows the exact shape of validated data
 * 
 * How It's Used:
 * 1. Form component uses this schema
 * 2. User fills out form
 * 3. On submit, Zod validates against schema
 * 4. If valid: Submit to backend
 * 5. If invalid: Show error messages
 * 
 * Schema Structure:
 * - userFormSchema: For creating new users
 * - editUserFormSchema: For updating existing users (all fields optional)
 */

import { z } from 'zod';

/**
 * User Form Schema
 * 
 * Defines validation rules for all user fields.
 * Each field has type, required status, min/max length, and format rules.
 */
export const userFormSchema = z.object({
  // Full Name Field
  // BEGINNER NOTE: Regex pattern allows letters, spaces, periods, apostrophes (O'Brien), hyphens (Mary-Jane)
  fullName: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Full name can only contain letters, spaces, periods, apostrophes, and hyphens'),

  // Email Field
  // BEGINNER NOTE: .email() is a built-in Zod validator that checks proper email format
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email must not exceed 255 characters'),

  // Phone Number Field
  // BEGINNER NOTE: Regex allows optional + prefix, then 1-9 digit, then up to 15 more digits
  // This handles international formats like +1-555-1234 or local formats like 555-1234
  phone: z.string()
    .min(1, 'Phone number is required')
    .regex(/^[+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
    .max(20, 'Phone number must not exceed 20 characters'),

  // Password Field
  // BEGINNER NOTE: In production, you'd want stronger rules (uppercase, numbers, special chars)
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must not exceed 128 characters'),

  // User Type Field
  // BEGINNER NOTE: z.enum() means value MUST be one of these three exact strings
  userType: z.enum(['pet_owner', 'veterinarian', 'administrator'], {
    required_error: 'Please select a user type'
  }),

  // Optional Fields (not required for all user types)
  // BEGINNER NOTE: .optional() means field can be empty/undefined

  address: z.string()
    .max(500, 'Address must not exceed 500 characters')
    .optional(),

  // Only for veterinarians
  specialization: z.string()
    .max(100, 'Specialization must not exceed 100 characters')
    .optional(),

  // Only for veterinarians
  licenseNumber: z.string()
    .max(50, 'License number must not exceed 50 characters')
    .optional(),

  // Only for administrators
  accessLevel: z.string()
    .max(50, 'Access level must not exceed 50 characters')
    .optional()
});

/**
 * Edit User Form Schema
 * 
 * BEGINNER EXPLANATION:
 * This schema is for UPDATING existing users, not creating new ones.
 * 
 * Key Differences from userFormSchema:
 * 1. .partial() makes ALL fields optional (since you might only update name, or only email, etc.)
 * 2. .extend() adds the 'id' field (required to know which user to update)
 * 
 * Why Separate Schema?
 * When editing, users don't need to re-enter everything. They might just
 * want to update their phone number, so we allow partial updates.
 */
export const editUserFormSchema = userFormSchema.partial().extend({
  id: z.string().min(1, 'User ID is required')
});

/**
 * TypeScript Types Generated from Schemas
 * 
 * BEGINNER EXPLANATION:
 * z.infer<> is Zod magic that creates TypeScript types from schemas.
 * This ensures your TypeScript code matches your validation rules exactly.
 * 
 * Example:
 * If you try to create a UserFormData object with wrong types,
 * TypeScript will catch the error before runtime!
 * 
 * Usage:
 * ```typescript
 * const userData: UserFormData = {
 *   fullName: 'John Doe',
 *   email: 'john@example.com',
 *   // ... other required fields
 * };
 * ```
 */
export type UserFormData = z.infer<typeof userFormSchema>;
export type EditUserFormData = z.infer<typeof editUserFormSchema>;
