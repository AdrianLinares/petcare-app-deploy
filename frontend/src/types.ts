/**
 * =============================================================================
 * TYPES.TS - TYPE DEFINITIONS FOR THE ENTIRE APPLICATION
 * =============================================================================
 * 
 * BEGINNER EXPLANATION:
 * Think of this file as a "dictionary" or "blueprint" for our data.
 * In TypeScript, we use "interfaces" to define what properties an object should have.
 * This helps catch errors before they happen!
 * 
 * Example: If we define a Pet must have a "name", TypeScript will yell at us
 * if we try to create a Pet without a name.
 * 
 * The "?" symbol means: "this property is optional (can be missing)"
 * Example: microchipId? means a pet might or might not have a microchip
 * =============================================================================
 */

/**
 * Pet Interface
 * 
 * Defines what information we store about each pet in the system.
 * This is used everywhere we work with pet data.
 * 
 * PROPERTIES EXPLAINED:
 * @property id - Unique identifier (like a social security number for pets)
 * @property ownerId - Links this pet to their owner (foreign key to User)
 * @property name - Pet's name (e.g., "Buddy", "Whiskers")
 * @property species - Type of animal (e.g., "Dog", "Cat", "Bird")
 * @property breed - Specific breed (e.g., "Golden Retriever", "Siamese")
 * @property age - How old the pet is in years
 * @property weight - Pet's weight in kilograms
 * @property color - Pet's color/appearance (e.g., "Golden", "Black and White")
 * @property gender - Either 'Male' or 'Female' (TypeScript enforces this!)
 * @property microchipId - Optional microchip number for identification
 * @property medicalHistory - Optional array of past medical records
 * @property vaccinations - Optional array of vaccination records
 * @property allergies - Optional list of things the pet is allergic to
 * @property medications - Optional array of current/past medications
 * @property notes - Optional special notes about the pet
 * @property createdAt - Optional timestamp when record was created
 */
export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  color: string;
  gender: 'Male' | 'Female'; // Only these two values are allowed!
  microchipId?: string;
  conditions?: string;
  medicalHistory?: MedicalRecord[];
  vaccinations?: VaccinationRecord[];
  allergies?: string[];
  medications?: MedicationRecord[];
  notes?: string;
  createdAt?: string;
}

/**
 * MedicalRecord Interface
 * 
 * Stores information about a pet's medical visit or health event.
 * Think of this as a doctor's note for pets.
 * 
 * PROPERTIES EXPLAINED:
 * @property id - Unique identifier for this medical record
 * @property petId - Which pet does this record belong to?
 * @property date - When did this medical event happen? (ISO date string)
 * @property recordType - Category of record (e.g., "checkup", "surgery", "emergency")
 * @property description - What happened during this visit? Detailed notes
 * @property veterinarianId - Optional: ID of the vet who saw the pet
 * @property veterinarianName - Name of the veterinarian (for display)
 * @property createdAt - When was this record created in the system?
 * @property updatedAt - When was this record last modified?
 */
export interface MedicalRecord {
  id: string;
  petId: string;
  date: string;
  recordType: string;
  description: string;
  veterinarianId?: string;
  veterinarianName: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * VaccinationRecord Interface
 * 
 * Tracks vaccinations given to pets, like keeping a vaccination card.
 * Important for reminding owners when next vaccination is due!
 * 
 * PROPERTIES EXPLAINED:
 * @property id - Unique identifier for this vaccination record
 * @property petId - Which pet received this vaccination?
 * @property vaccine - Name of the vaccine (e.g., "Rabies", "DHPP", "FVRCP")
 * @property date - When was the vaccine administered? (ISO date string)
 * @property nextDue - Optional: When is the next dose due? (for reminders)
 * @property administeredBy - Optional: ID of the vet who gave the vaccine
 * @property administeredByName - Optional: Name of the vet (for display)
 * @property createdAt - When was this record created?
 * @property updatedAt - When was this record last updated?
 */
export interface VaccinationRecord {
  id: string;
  petId: string;
  vaccine: string;
  date: string;
  nextDue?: string;
  administeredBy?: string;
  administeredByName?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * MedicationRecord Interface
 * 
 * Tracks medications prescribed to pets.
 * Like a prescription record showing current and past medications.
 * 
 * PROPERTIES EXPLAINED:
 * @property id - Unique identifier for this medication record
 * @property petId - Which pet is taking this medication?
 * @property name - Name of the medication (e.g., "Amoxicillin", "Heartgard")
 * @property dosage - How much and how often (e.g., "250mg twice daily")
 * @property startDate - When did the pet start taking this? (ISO date string)
 * @property endDate - Optional: When should they stop? (if not ongoing)
 * @property prescribedBy - Optional: ID of the vet who prescribed it
 * @property prescribedByName - Optional: Name of the prescribing vet
 * @property active - Is this medication currently being taken? (true/false)
 * @property createdAt - When was this record created?
 * @property updatedAt - When was this record last updated?
 */
export interface MedicationRecord {
  id: string;
  petId: string;
  name: string;
  dosage: string;
  startDate: string;
  endDate?: string;
  prescribedBy?: string;
  prescribedByName?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Appointment Interface
 * 
 * Represents a scheduled visit between a pet and veterinarian.
 * Like a calendar event with medical details.
 * 
 * PROPERTIES EXPLAINED:
 * @property id - Unique identifier for this appointment
 * @property petId - Which pet is this appointment for?
 * @property petName - Pet's name (for easy display without extra lookup)
 * @property ownerId - Who owns the pet? (for notifications)
 * @property veterinarian - Optional: Vet's name (legacy field)
 * @property veterinarianId - Optional: ID of the assigned veterinarian
 * @property veterinarianName - Optional: Vet's name (for display)
 * @property type - Type of appointment (e.g., "checkup", "vaccination", "surgery")
 * @property date - Appointment date (ISO date string, e.g., "2025-11-20")
 * @property time - Appointment time (e.g., "10:00", "14:30")
 * @property reason - Optional: Why is the pet coming in?
 * @property notes - Optional: Additional notes about the appointment
 * @property status - Current state: 'scheduled', 'completed', or 'cancelled'
 * @property diagnosis - Optional: What did the vet find? (filled after visit)
 * @property treatment - Optional: What treatment was given? (filled after visit)
 * @property followUpDate - Optional: When should they come back?
 * @property createdAt - When was this appointment created?
 */
export interface Appointment {
  id: string;
  petId: string;
  petName: string;
  ownerId: string;
  veterinarian?: string;
  veterinarianId?: string;
  veterinarianName?: string;
  type: string;
  date: string;
  time: string;
  reason?: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  diagnosis?: string;
  treatment?: string;
  followUpDate?: string;
  createdAt: string;
}

/**
 * User Interface
 * 
 * Represents any user in the system (pet owner, vet, or admin).
 * Different user types see different dashboards and have different permissions.
 * 
 * PROPERTIES EXPLAINED:
 * @property id - Unique identifier for this user
 * @property email - User's email (also used for login)
 * @property password - Hashed password (NEVER store plain text passwords!)
 * @property fullName - User's full name (e.g., "Dr. Sarah Johnson")
 * @property phone - Contact phone number (e.g., "+1-555-0101")
 * @property userType - Role in system: 'pet_owner', 'veterinarian', or 'administrator'
 * @property createdAt - When did this user create their account?
 * @property address - Optional: Physical address (used mainly for pet owners)
 * @property specialization - Optional: Vet's area of expertise (e.g., "Small Animals")
 * @property licenseNumber - Optional: Vet's medical license number
 * @property accessLevel - Optional: Admin permission level ('standard', 'elevated', 'super')
 * @property adminToken - Optional: Special token for admin operations
 */
export interface User {
  id: string;
  email: string;
  password: string;
  fullName: string;
  phone: string;
  userType: 'pet_owner' | 'veterinarian' | 'administrator';
  createdAt: string;
  address?: string;
  specialization?: string;
  licenseNumber?: string;
  accessLevel?: string;
  adminToken?: string;
}

/**
 * ClinicalRecord Interface
 * 
 * Detailed clinical notes from a veterinary visit.
 * This is more comprehensive than a basic MedicalRecord - it includes
 * symptoms, diagnosis, treatment plan, and follow-up information.
 * 
 * PROPERTIES EXPLAINED:
 * @property id - Unique identifier for this clinical record
 * @property petId - Which pet is this record for?
 * @property appointmentId - Optional: Link to the appointment that generated this
 * @property appointmentType - Optional: Type of appointment (for context)
 * @property veterinarianId - ID of the vet who wrote this record
 * @property veterinarianName - Vet's name (for display)
 * @property date - When was this visit? (ISO date string)
 * @property symptoms - What symptoms did the pet show? (e.g., "sneezing, lethargy")
 * @property diagnosis - What did the vet determine? (e.g., "Upper respiratory infection")
 * @property treatment - What treatment was provided? (e.g., "Antibiotics and rest")
 * @property medications - Optional: List of medications prescribed
 * @property notes - Optional: Additional clinical notes or observations
 * @property followUpDate - Optional: When should the pet return?
 * @property createdAt - When was this record created?
 * @property updatedAt - When was this record last modified?
 */
export interface ClinicalRecord {
  id: string;
  petId: string;
  appointmentId?: string;
  appointmentType?: string;
  veterinarianId: string;
  veterinarianName: string;
  date: string;
  symptoms: string;
  diagnosis: string;
  treatment: string;
  medications?: string[];
  notes?: string;
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * PasswordResetToken Interface
 * 
 * Temporary token used for password reset functionality.
 * These tokens expire after 1 hour for security.
 * 
 * @property id - Unique identifier
 * @property email - Which user is resetting their password?
 * @property token - Random secure token (sent in email link)
 * @property expiresAt - When does this token expire? (ISO timestamp)
 * @property createdAt - When was this token created?
 * @property used - Has this token been used already? (prevents reuse)
 * @property userType - Optional: What type of user is this?
 */
export interface PasswordResetToken {
  id: string;
  email: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  used: boolean;
  userType?: string;
}

/**
 * EmailLog Interface
 * 
 * Keeps a record of emails sent by the system (for debugging/audit).
 * In development, these are logged to console instead of actually sending.
 * 
 * @property to - Recipient email address
 * @property subject - Email subject line
 * @property resetToken - Optional: Password reset token (if applicable)
 * @property resetLink - Optional: Full password reset link
 * @property sentAt - When was this email sent? (ISO timestamp)
 * @property type - Category of email (helps with filtering logs)
 */
export interface EmailLog {
  to: string;
  subject: string;
  resetToken?: string;
  resetLink?: string;
  sentAt: string;
  type: 'password-reset' | 'password-changed' | 'welcome' | 'notification';
}

/**
 * Notification Interface
 * 
 * In-app notifications shown to users (like a notification bell).
 * Can remind users about appointments, vaccinations, etc.
 * 
 * @property id - Unique identifier
 * @property userId - Who should see this notification?
 * @property type - Category of notification (determines icon/color)
 * @property title - Short headline (e.g., "Appointment Reminder")
 * @property message - Full notification message
 * @property relatedEntityType - Optional: What is this notification about?
 * @property relatedEntityId - Optional: ID of the related item (for linking)
 * @property priority - How important is this? (affects display style)
 * @property read - Has the user seen this? (true/false)
 * @property readAt - Optional: When was it marked as read?
 * @property scheduledFor - Optional: When should this be shown?
 * @property sent - Has this been sent/shown to the user?
 * @property sentAt - Optional: When was it sent?
 * @property createdAt - When was this notification created?
 */
export interface Notification {
  id: string;
  userId: string;
  type: 'appointment_reminder' | 'appointment_cancelled' | 'appointment_rescheduled' |
  'vaccination_due' | 'medication_reminder' | 'medical_update' |
  'system_alert' | 'welcome' | 'password_changed';
  title: string;
  message: string;
  relatedEntityType?: 'appointment' | 'pet' | 'medication' | 'vaccination';
  relatedEntityId?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read: boolean;
  readAt?: string;
  scheduledFor?: string;
  sent: boolean;
  sentAt?: string;
  createdAt: string;
}

/**
 * AuthState Interface
 * 
 * Tracks which authentication screen the user should see.
 * Used to navigate between login, forgot password, and reset password screens.
 * 
 * @property view - Which auth screen to show?
 * @property resetToken - Optional: Token from password reset email
 */
export interface AuthState {
  view: 'login' | 'register' | 'forgot-password' | 'reset-password';
  resetToken?: string;
}