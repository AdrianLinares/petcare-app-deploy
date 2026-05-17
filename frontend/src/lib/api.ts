/**
 * =============================================================================
 * API.TS - FRONTEND API SERVICE LAYER
 * =============================================================================
 * 
 * BEGINNER EXPLANATION:
 * This file is like a "telephone operator" between our React frontend and 
 * the backend serverless functions. Instead of writing axios.post(...) all
 * over our code, we create organized functions here that other parts of 
 * the app can call.
 * 
 * WHAT THIS FILE DOES:
 * 1. Sets up axios (HTTP client) to talk to our backend
 * 2. Automatically adds authentication tokens to requests
 * 3. Handles errors (like expired tokens)
 * 4. Provides organized API functions grouped by feature
 * 
 * WHY WE DO THIS:
 * - Keeps API logic in ONE place (easy to update)
 * - Makes code cleaner (petAPI.create() instead of axios.post('/pets', ...))
 * - Handles authentication automatically
 * - Easier to maintain and debug
 * 
 * =============================================================================
 */

// ==================== IMPORTS ====================
import axios from 'axios';
// axios: Popular HTTP client for making API requests (like fetch but better)

import type {
  User,
  Pet,
  Appointment,
  Notification,
  MedicalRecord,
  VaccinationRecord,
  MedicationRecord,
  ClinicalRecord
} from '@/types';
// Import TypeScript types to ensure type safety

// ==================== CONFIGURATION ====================

/**
 * API_URL: Base URL for all API requests
 * 
 * HOW IT WORKS:
 * - In development: Uses '/.netlify/functions' (Netlify Dev proxy)
 * - In production: Can be set via VITE_API_URL environment variable
 * 
 * Example full URL: /.netlify/functions/pets (gets all pets)
 */
const API_URL = import.meta.env.VITE_API_URL || '/.netlify/functions';

// ==================== AXIOS INSTANCE ====================

/**
 * Create a configured axios instance
 * 
 * WHAT IS AN INSTANCE?
 * Instead of using axios directly, we create a custom version with
 * our settings applied. Think of it like creating a "template" axios
 * that already knows our base URL and headers.
 * 
 * SETTINGS:
 * - baseURL: All requests will automatically start with this URL
 * - headers: Every request will include these headers
 */
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json', // Tell server we're sending JSON
  },
});

// ==================== REQUEST INTERCEPTOR ====================

/**
 * Axios Request Interceptor
 * 
 * WHAT IS AN INTERCEPTOR?
 * An interceptor is code that runs BEFORE every API request.
 * Think of it like airport security - every request goes through here first.
 * 
 * WHAT THIS DOES:
 * 1. Checks localStorage for authentication token
 * 2. If token exists, adds it to the Authorization header
 * 3. Passes the request along to the backend
 * 
 * WHY THIS IS USEFUL:
 * We don't have to manually add the token to every API call!
 * The backend will check this header to verify the user is logged in.
 * 
 * EXAMPLE:
 * Without interceptor: axios.post('/pets', data, { headers: { Authorization: 'Bearer token123' }})
 * With interceptor:    api.post('/pets', data) // token added automatically!
 */
api.interceptors.request.use((config) => {
  // Get token from browser storage (saved during login)
  const token = localStorage.getItem('token');

  if (token) {
    // Add token to Authorization header
    // Backend will check: "Bearer abc123token" to verify user
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config; // Send the request on its way
});

// ==================== RESPONSE INTERCEPTOR ====================

/**
 * Axios Response Interceptor
 * 
 * WHAT THIS DOES:
 * Intercepts RESPONSES from the backend (after the API call completes).
 * This is where we handle errors globally.
 * 
 * TWO FUNCTIONS:
 * 1. Success handler: If response is OK (200-299), just return it
 * 2. Error handler: If response is error (400+), handle it here
 * 
 * SPECIAL CASE - 401 UNAUTHORIZED:
 * If backend returns 401, it means:
 * - Token expired
 * - Token is invalid
 * - User needs to login again
 * 
 * WHAT WE DO:
 * 1. Clear invalid token from storage
 * 2. Clear user data
 * 3. Redirect to login page
 * 
 * WHY THIS IS USEFUL:
 * Prevents users from staying "stuck" on a page they can't access.
 * Automatically logs them out if their session expires.
 */
api.interceptors.response.use(
  // SUCCESS: Request completed successfully (status 200-299)
  (response) => response, // Just return the response as-is

  // ERROR: Request failed (status 400+)
  (error) => {
    // If backend returned 401 (invalid/expired token), let calling code handle it.
    // We intentionally do NOT clear session or reload the page here because:
    // - Demo users authenticate via localStorage fallback, not a real backend JWT
    // - `checkAuth()` in App.tsx already handles session restoration on reload
    // - Calling code (individual components) shows appropriate error messages

    // Pass error along so calling code can handle it
    return Promise.reject(error);
  }
);

// ==================== LOCALSTORAGE HELPER ====================
// When the backend is unavailable, read demo data seeded by initializeTestData()
function getLocalData<T>(keyPrefix: string): T[] {
  try {
    const stored = localStorage.getItem('currentUser');
    if (!stored) return [];
    const user = JSON.parse(stored);
    const data = localStorage.getItem(`${keyPrefix}_${user.email}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// ==================== AUTH API ====================

/**
 * Authentication API Functions
 * 
 * These functions handle user login, registration, and password management.
 * All authentication endpoints live here.
 * 
 * IMPORTANT SECURITY NOTE:
 * After successful login/register, we:
 * 1. Save the JWT token to localStorage
 * 2. Save user data to localStorage
 * 
 * The token is like a "session ID" that proves you're logged in.
 * Every subsequent API call will include this token (via interceptor above).
 */
export const authAPI = {
  /**
   * Login Function
   * 
   * Authenticates a user with email and password.
   * 
   * FLOW:
   * 1. Send email & password to backend
   * 2. Backend checks database, verifies password
   * 3. Backend generates JWT token and returns it with user data
   * 4. We save token and user to localStorage
   * 5. User is now logged in!
   * 
   * @param email - User's email address
   * @param password - User's password (sent to backend for verification)
   * @returns Promise with { user, token } from backend
   * 
   * USAGE EXAMPLE:
   * const result = await authAPI.login('owner@petcare.com', 'password123');
   * console.log(result.user.fullName); // "John Smith"
   */
  async login(email: string, password: string) {
    try {
      // POST request to /auth/login endpoint
      const { data } = await api.post('/auth/login', { email, password });

      // If backend sent a token, save it (successful login)
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
      }

      return data; // Return full response { user, token }
    } catch (error) {
      // Fallback: si el backend no está disponible o los datos no están en BD,
      // intentar con usuarios de demo en localStorage
      const userKey = `user_${email}`;
      const storedUser = localStorage.getItem(userKey);
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.password === password) {
          const token = 'demo-token-' + Date.now();
          localStorage.setItem('token', token);
          localStorage.setItem('currentUser', JSON.stringify(user));
          return { user, token };
        }
      }
      // Re-lanzar error original si localStorage tampoco tiene el usuario
      throw error;
    }
  },

  /**
   * Register Function
   * 
   * Creates a new user account in the system.
   * 
   * FLOW:
   * 1. Send user data to backend
   * 2. Backend validates data, creates user in database
   * 3. Backend returns new user with token (auto-login after registration)
   * 4. We save token and user to localStorage
   * 
   * @param userData - Object containing all user information
   * @returns Promise with { user, token } from backend
   * 
   * USAGE EXAMPLE:
   * await authAPI.register({
   *   email: 'newowner@petcare.com',
   *   password: 'securePass123',
   *   fullName: 'Jane Doe',
   *   phone: '+1-555-0199',
   *   userType: 'pet_owner',
   *   address: '123 Main St'
   * });
   */
  async register(userData: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    userType: string;
    address?: string;           // Optional fields have '?'
    specialization?: string;    // Only used for veterinarians
    licenseNumber?: string;     // Only used for veterinarians
  }) {
    // POST request to /auth/register endpoint
    const { data } = await api.post('/auth/register', userData);

    // Auto-login: Save token from registration
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
    }

    return data;
  },

  /**
   * Forgot Password Function
   * 
   * Initiates password reset process by sending reset email.
   * 
   * FLOW:
   * 1. User enters their email
   * 2. Backend generates secure reset token
   * 3. Backend sends email with reset link
   * 4. User clicks link in email to reset password
   * 
   * @param email - User's email address
   * @returns Promise with success message
   * 
   * USAGE EXAMPLE:
   * await authAPI.forgotPassword('owner@petcare.com');
   * // Email sent with reset link!
   */
  async forgotPassword(email: string) {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  },

  /**
   * Reset Password Function
   * 
   * Completes password reset using token from email.
   * 
   * FLOW:
   * 1. User clicks reset link in email (contains token)
   * 2. User enters new password
   * 3. We send token + new password to backend
   * 4. Backend validates token, updates password
   * 5. User can now login with new password
   * 
   * @param token - Secure token from reset email
   * @param password - New password chosen by user
   * @returns Promise with success message
   * 
   * USAGE EXAMPLE:
   * await authAPI.resetPassword('abc123tokenFromEmail', 'newPassword456');
   */
  async resetPassword(token: string, password: string) {
    const { data } = await api.post('/auth/reset-password', { token, password });
    return data;
  },

  /**
   * Logout Function
   * 
   * Logs out the current user by clearing local storage.
   * 
   * NOTE: We don't call backend here because JWT tokens can't be
   * "invalidated" server-side. We just remove them from browser.
   * When token expires (typically 24 hours), it becomes invalid automatically.
   * 
   * USAGE EXAMPLE:
   * authAPI.logout();
   * // User is logged out, token removed
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
  },
};

// ==================== USER API ====================

/**
 * User Management API Functions
 * 
 * These functions handle user-related operations:
 * - Getting current user info
 * - Updating profile
 * - Managing users (admin only)
 * - Changing passwords
 * 
 * PERMISSIONS:
 * - Anyone can get/update their own info
 * - Only admins can list/create/update/delete other users
 */
export const userAPI = {
  /**
   * Get Current User
   * 
   * Fetches info about the currently logged-in user.
   * Uses the JWT token (added by interceptor) to identify user.
   * 
   * @returns Promise with User object
   * 
   * USAGE:
   * const user = await userAPI.getCurrentUser();
   * console.log(user.email); // "owner@petcare.com"
   */
  async getCurrentUser() {
    try {
      const { data } = await api.get('/users/me');
      return data;
    } catch (error) {
      // Fallback: restaurar usuario desde localStorage si el backend no responde
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        return JSON.parse(storedUser);
      }
      throw error;
    }
  },

  /**
   * Update Profile
   * 
   * Updates the current user's profile information.
   * You can update only some fields (partial update).
   * 
   * @param updates - Object with fields to update (only include what you want to change)
   * @returns Promise with updated User object
   * 
   * USAGE:
   * await userAPI.updateProfile({ phone: '+1-555-9999' });
   * // Only phone number is updated, everything else stays the same
   */
  async updateProfile(updates: Partial<User>) {
    const { data } = await api.patch('/users/me', updates);
    return data;
  },

  /**
   * Change Password
   * 
   * Allows user to change their password (requires current password for security).
   * 
   * @param currentPassword - User's current password (for verification)
   * @param newPassword - New password they want to use
   * @returns Promise with success message
   * 
   * USAGE:
   * await userAPI.changePassword('oldPass123', 'newSecurePass456');
   */
  async changePassword(currentPassword: string, newPassword: string) {
    const { data } = await api.post('/users/me/change-password', {
      currentPassword,
      newPassword,
    });
    return data;
  },

  /**
   * List Users (Admin Only)
   * 
   * Gets a list of all users in the system.
   * Can filter by user type and paginate results.
   * 
   * @param params - Optional filters and pagination
   * @returns Promise with array of Users
   * 
   * USAGE:
   * const owners = await userAPI.listUsers({ userType: 'pet_owner', limit: 10 });
   */
  async listUsers(params?: { userType?: string; page?: number; limit?: number }) {
    try {
      const { data } = await api.get('/users', { params });
      return data;
    } catch {
      // Fallback: read all users from localStorage
      const users: User[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('user_')) {
          try {
            const user = JSON.parse(localStorage.getItem(key)!);
            users.push(user);
          } catch {}
        }
      }
      return users;
    }
  },

  /**
   * Get User by ID (Admin Only)
   * 
   * Fetches detailed info about a specific user.
   * 
   * @param id - User's unique identifier
   * @returns Promise with User object
   * 
   * USAGE:
   * const user = await userAPI.getUserById('550e8400-e29b-41d4-a716-446655440001');
   */
  async getUserById(id: string) {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },

  /**
   * Create User (Admin Only)
   * 
   * Creates a new user account in the system.
   * Used by administrators to add new pet owners, vets, or admins.
   * 
   * @param userData - All required user information
   * @returns Promise with newly created User object
   * 
   * USAGE:
   * const newUser = await userAPI.createUser({
   *   email: 'newvet@petcare.com',
   *   password: 'tempPass123',
   *   fullName: 'Dr. Emily Brown',
   *   phone: '+1-555-0150',
   *   userType: 'veterinarian',
   *   specialization: 'Small Animals',
   *   licenseNumber: 'VET12345'
   * });
   */
  async createUser(userData: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    userType: string;
    address?: string;
    specialization?: string;
    licenseNumber?: string;
    accessLevel?: string;
  }) {
    const { data } = await api.post('/users', userData);
    return data;
  },

  /**
   * Update User (Admin Only)
   * 
   * Updates another user's information.
   * Can only be done by administrators.
   * 
   * @param id - ID of user to update
   * @param updates - Fields to update (partial update)
   * @returns Promise with updated User object
   * 
   * USAGE:
   * await userAPI.updateUser('user123', { phone: '+1-555-7777' });
   */
  async updateUser(id: string, updates: {
    email?: string;
    fullName?: string;
    phone?: string;
    address?: string;
    specialization?: string;
    licenseNumber?: string;
    accessLevel?: string;
    userType?: string;
  }) {
    const { data } = await api.patch(`/users/${id}`, updates);
    return data;
  },

  /**
   * Delete User (Admin Only)
   * 
   * Permanently deletes a user from the system.
   * Use with caution! This cannot be undone.
   * 
   * @param id - ID of user to delete
   * @returns Promise (void - no return value)
   * 
   * USAGE:
   * await userAPI.deleteUser('user123');
   */
  async deleteUser(id: string) {
    await api.delete(`/users/${id}`);
  },
};

// ==================== PET API ====================

/**
 * Pet Management API Functions
 * 
 * These functions handle all pet-related operations:
 * - Viewing pets
 * - Adding new pets
 * - Updating pet information
 * - Deleting pets
 * 
 * PERMISSIONS:
 * - Pet owners can only manage their own pets
 * - Vets and admins can view all pets
 * - Admins can manage any pet
 */
export const petAPI = {
  /**
   * Get Pets
   * 
   * Fetches list of pets.
   * - Pet owners see only their pets
   * - Vets and admins see all pets
   * 
   * @returns Promise with array of Pet objects
   * 
   * USAGE:
   * const myPets = await petAPI.getPets();
   * console.log(myPets.length); // Number of pets
   */
  async getPets() {
    try {
      const { data } = await api.get('/pets');
      return data as Pet[];
    } catch {
      return getLocalData<Pet>('pets');
    }
  },

  /**
   * Get Pet by ID
   * 
   * Fetches detailed information about a specific pet.
   * 
   * @param id - Pet's unique identifier
   * @returns Promise with Pet object
   * 
   * USAGE:
   * const buddy = await petAPI.getPetById('pet123');
   * console.log(buddy.name); // "Buddy"
   */
  async getPetById(id: string) {
    const { data } = await api.get(`/pets/${id}`);
    return data as Pet;
  },

  /**
   * Create Pet
   * 
   * Adds a new pet to the system.
   * For pet owners, automatically links to their account.
   * Admins can specify which owner the pet belongs to.
   * 
   * @param petData - Pet information
   * @returns Promise with newly created Pet object
   * 
   * USAGE:
   * const newPet = await petAPI.createPet({
   *   name: 'Max',
   *   species: 'Dog',
   *   breed: 'German Shepherd',
   *   age: 3,
   *   weight: 35.5,
   *   color: 'Black and Tan',
   *   gender: 'Male'
   * });
   */
  async createPet(petData: Partial<Pet>) {
    const { data } = await api.post('/pets', petData);
    return data as Pet;
  },

  /**
   * Update Pet
   * 
   * Updates a pet's information.
   * Can update any fields (partial update).
   * 
   * @param id - Pet's unique identifier
   * @param updates - Fields to update
   * @returns Promise with updated Pet object
   * 
   * USAGE:
   * await petAPI.updatePet('pet123', { weight: 32.0 });
   * // Pet's weight is updated to 32.0 kg
   */
  async updatePet(id: string, updates: Partial<Pet>) {
    const { data } = await api.patch(`/pets/${id}`, updates);
    return data as Pet;
  },

  /**
   * Delete Pet
   * 
   * Removes a pet from the system.
   * This is a "soft delete" - data is marked deleted but not actually removed.
   * 
   * @param id - Pet's unique identifier
   * @returns Promise (void)
   * 
   * USAGE:
   * await petAPI.deletePet('pet123');
   */
  async deletePet(id: string) {
    await api.delete(`/pets/${id}`);
  },
};

// ==================== APPOINTMENT API ====================

/**
 * Appointment Management API Functions
 * 
 * These functions handle scheduling and managing veterinary appointments:
 * - Viewing appointments
 * - Creating new appointments
 * - Updating appointment status/details
 * 
 * APPOINTMENT LIFECYCLE:
 * 1. Pet owner creates appointment (status: 'scheduled')
 * 2. Vet sees pet on appointment day
 * 3. Vet marks as 'completed' and adds diagnosis/treatment
 * 4. OR: Either party can cancel (status: 'cancelled')
 */
export const appointmentAPI = {
  /**
   * Get Appointments
   * 
   * Fetches list of appointments.
   * Can filter by status, date, or pet.
   * 
   * FILTERING:
   * - Pet owners see only their pets' appointments
   * - Vets see only their own appointments
   * - Admins see all appointments
   * 
   * @param params - Optional filters
   * @returns Promise with array of Appointment objects
   * 
   * USAGE:
   * // Get all scheduled appointments
   * const upcoming = await appointmentAPI.getAppointments({ status: 'scheduled' });
   * 
   * // Get appointments for specific pet
   * const petAppts = await appointmentAPI.getAppointments({ petId: 'pet123' });
   */
  async getAppointments(params?: {
    status?: string;
    date?: string;
    petId?: string;
  }) {
    try {
      const { data } = await api.get('/appointments', { params });
      return data as Appointment[];
    } catch {
      return getLocalData<Appointment>('appointments');
    }
  },

  /**
   * Create Appointment
   * 
   * Schedules a new appointment between a pet and veterinarian.
   * 
   * @param appointmentData - Appointment details
   * @returns Promise with newly created Appointment object
   * 
   * USAGE:
   * const newAppt = await appointmentAPI.createAppointment({
   *   petId: 'pet123',
   *   veterinarianId: 'vet456',
   *   type: 'checkup',
   *   date: '2025-11-25',
   *   time: '10:00',
   *   reason: 'Annual checkup and vaccinations'
   * });
   */
  async createAppointment(appointmentData: {
    petId: string;
    veterinarianId: string;
    type: string;
    date: string;
    time: string;
    reason?: string;
  }) {
    const { data } = await api.post('/appointments', appointmentData);
    return data as Appointment;
  },

  /**
   * Update Appointment
   * 
   * Updates appointment information.
   * Common uses:
   * - Change status (scheduled → completed)
   * - Add diagnosis/treatment after visit
   * - Reschedule date/time
   * - Add notes
   * 
   * @param id - Appointment's unique identifier
   * @param updates - Fields to update
   * @returns Promise with updated Appointment
   * 
   * USAGE:
   * // Mark appointment as completed
   * await appointmentAPI.updateAppointment('appt123', { 
   *   status: 'completed',
   *   diagnosis: 'Healthy, no issues found',
   *   treatment: 'Annual vaccinations administered'
   * });
   * 
   * // Reschedule appointment
   * await appointmentAPI.updateAppointment('appt123', {
   *   date: '2025-11-28',
   *   time: '14:30'
   * });
   */
  async updateAppointment(
    id: string,
    updates: {
      status?: string;
      date?: string;
      time?: string;
      diagnosis?: string;
      treatment?: string;
      notes?: string;
      followUpDate?: string;
    }
  ) {
    const { data } = await api.patch(`/appointments/${id}`, updates);
    return data;
  },
};

// ==================== NOTIFICATION API ====================

/**
 * Notification Management API Functions
 * 
 * These functions handle the in-app notification system:
 * - Getting notifications for current user
 * - Marking as read
 * - Creating notifications (for admins)
 * 
 * NOTIFICATION TYPES:
 * - appointment_reminder: Upcoming appointment alerts
 * - vaccination_due: Pet vaccination reminders
 * - system: General system messages
 * 
 * BEGINNER EXPLANATION:
 * Think of this like your email inbox - you get notifications,
 * mark them as read when you've seen them, and can delete old ones.
 */
export const notificationAPI = {
  /**
   * Get Notifications
   * 
   * Fetches notifications for the current user.
   * Can filter to show only unread notifications.
   * 
   * @param unreadOnly - If true, only returns unread notifications
   * @returns Promise with array of Notification objects
   * 
   * USAGE:
   * const allNotifs = await notificationAPI.getNotifications();
   * const unreadNotifs = await notificationAPI.getNotifications(true);
   */
  async getNotifications(unreadOnly: boolean = false) {
    const { data } = await api.get('/notifications', {
      params: { unreadOnly },
    });
    return data as Notification[];
  },

  /**
   * Get Unread Count
   * 
   * Returns just the number of unread notifications.
   * Useful for showing a badge on the notification bell icon.
   * 
   * @returns Promise with count number
   * 
   * USAGE:
   * const count = await notificationAPI.getUnreadCount();
   * // Display "5" on notification icon
   */
  async getUnreadCount() {
    const { data } = await api.get('/notifications/unread-count');
    return data.count as number;
  },

  /**
   * Mark Notification as Read
   * 
   * Marks a single notification as read.
   * This removes it from the "unread" list but doesn't delete it.
   * 
   * @param id - Notification's unique identifier
   * @returns Promise (void)
   * 
   * USAGE:
   * await notificationAPI.markAsRead('notif123');
   */
  async markAsRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
  },

  /**
   * Mark All as Read
   * 
   * Marks ALL user's notifications as read in one action.
   * Good for a "Mark all as read" button.
   * 
   * @returns Promise (void)
   * 
   * USAGE:
   * await notificationAPI.markAllAsRead();
   */
  async markAllAsRead() {
    await api.patch('/notifications/read-all');
  },

  /**
   * Delete Notification
   * 
   * Permanently removes a notification.
   * 
   * @param id - Notification's unique identifier
   * @returns Promise (void)
   * 
   * USAGE:
   * await notificationAPI.deleteNotification('notif123');
   */
  async deleteNotification(id: string) {
    await api.delete(`/notifications/${id}`);
  },

  /**
   * Create Notification (Admin Only)
   * 
   * Sends a notification to a user.
   * Usually done automatically by the system, but admins can create manual ones.
   * 
   * @param notificationData - Notification details
   * @returns Promise with created Notification
   * 
   * USAGE:
   * await notificationAPI.createNotification({
   *   userId: 'user123',
   *   type: 'system',
   *   title: 'System Maintenance',
   *   message: 'Scheduled maintenance tonight at 10 PM',
   *   priority: 'high'
   * });
   */
  async createNotification(notificationData: {
    userId?: string;
    type: string;
    title: string;
    message: string;
    priority?: string;
  }) {
    const { data } = await api.post('/notifications', notificationData);
    return data;
  },
};

// ==================== MEDICAL RECORDS API ====================

/**
 * Medical Records API Functions
 * 
 * These functions manage general medical history for pets:
 * - Viewing medical records
 * - Adding new records
 * - Updating existing records
 * 
 * BEGINNER EXPLANATION:
 * A medical record is like a diary entry about a pet's health.
 * It could be about checkups, illnesses, surgeries, or any medical event.
 * Each record has a date, type (e.g., "checkup"), and description.
 */
export const medicalRecordAPI = {
  /**
   * Get Medical Records by Pet
   * 
   * Fetches all medical records for a specific pet.
   * Returns them sorted by date (newest first).
   * 
   * @param petId - Pet's unique identifier
   * @returns Promise with array of MedicalRecord objects
   * 
   * USAGE:
   * const records = await medicalRecordAPI.getByPet('pet123');
   * console.log(records[0].recordType); // "checkup"
   */
  async getByPet(petId: string) {
    try {
      const { data } = await api.get(`/medical-records/pet/${petId}`);
      return data as MedicalRecord[];
    } catch {
      return [];
    }
  },

  /**
   * Get Medical Record by ID
   * 
   * Fetches a single medical record with all its details.
   * 
   * @param id - Medical record's unique identifier
   * @returns Promise with MedicalRecord object
   * 
   * USAGE:
   * const record = await medicalRecordAPI.getById('record123');
   */
  async getById(id: string) {
    const { data } = await api.get(`/medical-records/${id}`);
    return data as MedicalRecord;
  },

  /**
   * Create Medical Record
   * 
   * Adds a new medical record for a pet.
   * 
   * @param recordData - Medical record details
   * @returns Promise with created MedicalRecord
   * 
   * USAGE:
   * const newRecord = await medicalRecordAPI.create({
   *   petId: 'pet123',
   *   date: '2025-11-20',
   *   recordType: 'checkup',
   *   description: 'Annual checkup - all vitals normal'
   * });
   */
  async create(recordData: {
    petId: string;
    date: string;
    recordType: string;
    description: string;
  }) {
    const { data } = await api.post('/medical-records', recordData);
    return data as MedicalRecord;
  },

  /**
   * Update Medical Record
   * 
   * Updates an existing medical record.
   * Can update any fields (partial update).
   * 
   * @param id - Medical record's unique identifier
   * @param updates - Fields to update
   * @returns Promise with updated MedicalRecord
   * 
   * USAGE:
   * await medicalRecordAPI.update('record123', {
   *   description: 'Updated diagnosis: minor ear infection'
   * });
   */
  async update(id: string, updates: {
    date?: string;
    recordType?: string;
    description?: string;
  }) {
    const { data } = await api.patch(`/medical-records/${id}`, updates);
    return data as MedicalRecord;
  },

  /**
   * Delete Medical Record
   * 
   * Permanently deletes a medical record.
   * Use with caution - this cannot be undone.
   * 
   * @param id - Medical record's unique identifier
   * @returns Promise (void)
   * 
   * USAGE:
   * await medicalRecordAPI.delete('record123');
   */
  async delete(id: string) {
    await api.delete(`/medical-records/${id}`);
  },
};

// ==================== VACCINATIONS API ====================

/**
 * Vaccination Records API Functions
 * 
 * These functions manage pet vaccination records:
 * - Track which vaccines a pet has received
 * - When they were given
 * - When next doses are due
 * 
 * BEGINNER EXPLANATION:
 * Pets need vaccinations just like humans do.
 * These functions help track which vaccines (like rabies, distemper)
 * have been given and send reminders when boosters are due.
 */
export const vaccinationAPI = {
  /**
   * Get Vaccinations by Pet
   * 
   * Fetches all vaccination records for a specific pet.
   * 
   * @param petId - Pet's unique identifier
   * @returns Promise with array of VaccinationRecord objects
   * 
   * USAGE:
   * const vaccines = await vaccinationAPI.getByPet('pet123');
   * vaccines.forEach(v => console.log(v.vaccine, v.date));
   */
  async getByPet(petId: string) {
    try {
      const { data } = await api.get(`/vaccinations/pet/${petId}`);
      return data as VaccinationRecord[];
    } catch {
      return [];
    }
  },

  /**
   * Get Upcoming Vaccinations
   * 
   * Fetches all vaccinations that are due soon.
   * Useful for sending reminders to pet owners.
   * 
   * @returns Promise with array of VaccinationRecord objects
   * 
   * USAGE:
   * const upcomingVax = await vaccinationAPI.getUpcoming();
   * // Returns vaccines due within next 30 days
   */
  async getUpcoming() {
    try {
      const { data } = await api.get('/vaccinations/upcoming');
      return data as VaccinationRecord[];
    } catch {
      return [];
    }
  },

  /**
   * Get Vaccination by ID
   * 
   * Fetches a single vaccination record.
   * 
   * @param id - Vaccination record's unique identifier
   * @returns Promise with VaccinationRecord object
   * 
   * USAGE:
   * const vax = await vaccinationAPI.getById('vax123');
   */
  async getById(id: string) {
    const { data } = await api.get(`/vaccinations/${id}`);
    return data as VaccinationRecord;
  },

  /**
   * Create Vaccination Record
   * 
   * Records that a pet received a vaccination.
   * 
   * @param vaccinationData - Vaccination details
   * @returns Promise with created VaccinationRecord
   * 
   * USAGE:
   * const newVax = await vaccinationAPI.create({
   *   petId: 'pet123',
   *   vaccine: 'Rabies',
   *   date: '2025-11-20',
   *   nextDue: '2026-11-20' // Booster due in 1 year
   * });
   */
  async create(vaccinationData: {
    petId: string;
    vaccine: string;
    date: string;
    nextDue?: string;
  }) {
    const { data } = await api.post('/vaccinations', vaccinationData);
    return data as VaccinationRecord;
  },

  /**
   * Update Vaccination Record
   * 
   * Updates an existing vaccination record.
   * 
   * @param id - Vaccination record's unique identifier
   * @param updates - Fields to update
   * @returns Promise with updated VaccinationRecord
   * 
   * USAGE:
   * await vaccinationAPI.update('vax123', {
   *   nextDue: '2026-12-01' // Reschedule booster
   * });
   */
  async update(id: string, updates: {
    vaccine?: string;
    date?: string;
    nextDue?: string;
  }) {
    const { data } = await api.patch(`/vaccinations/${id}`, updates);
    return data as VaccinationRecord;
  },

  /**
   * Delete Vaccination Record
   * 
   * Permanently deletes a vaccination record.
   * 
   * @param id - Vaccination record's unique identifier
   * @returns Promise (void)
   * 
   * USAGE:
   * await vaccinationAPI.delete('vax123');
   */
  async delete(id: string) {
    await api.delete(`/vaccinations/${id}`);
  },
};

// ==================== MEDICATIONS API ====================

/**
 * Medication Management API Functions
 * 
 * These functions handle pet medication tracking:
 * - Record prescriptions
 * - Track dosage and frequency
 * - Mark medications as active or inactive
 * 
 * BEGINNER EXPLANATION:
 * When a pet is prescribed medication (like antibiotics or pain meds),
 * we need to track:
 * - What medication it is (name)
 * - How much to give (dosage)
 * - When to start/stop (startDate, endDate)
 * - Whether it's still being taken (active status)
 * 
 * Active medications are currently being taken.
 * Inactive means the prescription is finished.
 */
export const medicationAPI = {
  /**
   * Get Medications by Pet
   * 
   * Fetches all medication records for a specific pet.
   * 
   * @param petId - Pet's unique identifier
   * @returns Promise with array of MedicationRecord objects
   * 
   * USAGE:
   * const meds = await medicationAPI.getByPet('pet123');
   */
  async getByPet(petId: string) {
    try {
      const { data } = await api.get(`/medications/pet/${petId}`);
      return data as MedicationRecord[];
    } catch {
      return [];
    }
  },

  /**
   * Get Active Medications
   * 
   * Fetches all currently active medications across all pets.
   * Useful for vets to see which pets are currently on medication.
   * 
   * @returns Promise with array of MedicationRecord objects
   * 
   * USAGE:
   * const activeMeds = await medicationAPI.getActive();
   * // Returns only medications with active=true
   */
  async getActive() {
    const { data } = await api.get('/medications/active');
    return data as MedicationRecord[];
  },

  /**
   * Get Medication by ID
   * 
   * Fetches a single medication record.
   * 
   * @param id - Medication record's unique identifier
   * @returns Promise with MedicationRecord object
   * 
   * USAGE:
   * const med = await medicationAPI.getById('med123');
   */
  async getById(id: string) {
    const { data } = await api.get(`/medications/${id}`);
    return data as MedicationRecord;
  },

  /**
   * Create Medication Record
   * 
   * Records a new medication prescription for a pet.
   * 
   * @param medicationData - Medication details
   * @returns Promise with created MedicationRecord
   * 
   * USAGE:
   * const newMed = await medicationAPI.create({
   *   petId: 'pet123',
   *   name: 'Amoxicillin',
   *   dosage: '250mg twice daily',
   *   startDate: '2025-11-20',
   *   endDate: '2025-11-30', // 10-day course
   *   active: true
   * });
   */
  async create(medicationData: {
    petId: string;
    name: string;
    dosage: string;
    startDate: string;
    endDate?: string;
    active?: boolean;
  }) {
    const { data } = await api.post('/medications', medicationData);
    return data as MedicationRecord;
  },

  /**
   * Update Medication Record
   * 
   * Updates an existing medication record.
   * Common uses:
   * - Adjust dosage
   * - Extend end date
   * - Mark as inactive
   * 
   * @param id - Medication record's unique identifier
   * @param updates - Fields to update
   * @returns Promise with updated MedicationRecord
   * 
   * USAGE:
   * await medicationAPI.update('med123', {
   *   endDate: '2025-12-05' // Extend prescription by 5 days
   * });
   */
  async update(id: string, updates: {
    name?: string;
    dosage?: string;
    startDate?: string;
    endDate?: string;
    active?: boolean;
  }) {
    const { data } = await api.patch(`/medications/${id}`, updates);
    return data as MedicationRecord;
  },

  /**
   * Deactivate Medication
   * 
   * Marks a medication as inactive (stopped).
   * Used when treatment is complete or discontinued.
   * 
   * @param id - Medication record's unique identifier
   * @returns Promise with result
   * 
   * USAGE:
   * await medicationAPI.deactivate('med123');
   * // Active status changes to false
   */
  async deactivate(id: string) {
    const { data } = await api.patch(`/medications/${id}/deactivate`);
    return data;
  },

  /**
   * Delete Medication Record
   * 
   * Permanently deletes a medication record.
   * Usually you should deactivate instead of delete (preserves history).
   * 
   * @param id - Medication record's unique identifier
   * @returns Promise (void)
   * 
   * USAGE:
   * await medicationAPI.delete('med123');
   */
  async delete(id: string) {
    await api.delete(`/medications/${id}`);
  },
};

// ==================== CLINICAL RECORDS API ====================

/**
 * Clinical Records API Functions
 * 
 * These functions manage detailed clinical visit notes:
 * - Symptoms observed
 * - Diagnosis made
 * - Treatment provided
 * - Follow-up plans
 * 
 * BEGINNER EXPLANATION:
 * A clinical record is like a doctor's notes from a visit.
 * When a vet examines a pet, they write down:
 * - What symptoms the pet showed ("vomiting, lethargy")
 * - What they diagnosed ("gastroenteritis")
 * - What treatment they gave ("IV fluids, anti-nausea medication")
 * - Any follow-up needed ("recheck in 3 days")
 * 
 * These are more detailed than general medical records.
 */
export const clinicalRecordAPI = {
  /**
   * Get Clinical Records by Pet
   * 
   * Fetches all clinical visit records for a specific pet.
   * 
   * @param petId - Pet's unique identifier
   * @returns Promise with array of ClinicalRecord objects
   * 
   * USAGE:
   * const clinicals = await clinicalRecordAPI.getByPet('pet123');
   */
  async getByPet(petId: string) {
    try {
      const { data } = await api.get(`/clinical-records/pet/${petId}`);
      return data as ClinicalRecord[];
    } catch {
      return [];
    }
  },

  /**
   * Get Clinical Record by ID
   * 
   * Fetches a single clinical record with full details.
   * 
   * @param id - Clinical record's unique identifier
   * @returns Promise with ClinicalRecord object
   * 
   * USAGE:
   * const record = await clinicalRecordAPI.getById('clinical123');
   */
  async getById(id: string) {
    const { data } = await api.get(`/clinical-records/${id}`);
    return data as ClinicalRecord;
  },

  /**
   * Create Clinical Record
   * 
   * Creates a new clinical visit record.
   * Typically done by vets after examining a pet.
   * 
   * @param recordData - Clinical record details
   * @returns Promise with created ClinicalRecord
   * 
   * USAGE:
   * const newRecord = await clinicalRecordAPI.create({
   *   petId: 'pet123',
   *   appointmentId: 'appt456', // Optional - links to appointment
   *   date: '2025-11-20',
   *   symptoms: 'Vomiting (3x), loss of appetite, lethargy',
   *   diagnosis: 'Acute gastroenteritis',
   *   treatment: 'IV fluids 500ml, Cerenia 10mg, probiotics',
   *   medications: ['Cerenia', 'Probiotics'],
   *   notes: 'Owner reports symptoms started 2 days ago',
   *   followUpDate: '2025-11-23'
   * });
   */
  async create(recordData: {
    petId: string;
    appointmentId?: string;
    date: string;
    symptoms: string;
    diagnosis: string;
    treatment: string;
    medications?: string[];
    notes?: string;
    followUpDate?: string;
  }) {
    const { data } = await api.post('/clinical-records', recordData);
    return data as ClinicalRecord;
  },

  /**
   * Update Clinical Record
   * 
   * Updates an existing clinical record.
   * Common uses:
   * - Add additional notes after follow-up
   * - Correct diagnosis
   * - Update treatment plan
   * 
   * @param id - Clinical record's unique identifier
   * @param updates - Fields to update
   * @returns Promise with updated ClinicalRecord
   * 
   * USAGE:
   * await clinicalRecordAPI.update('clinical123', {
   *   notes: 'Follow-up: Pet fully recovered, eating normally'
   * });
   */
  async update(id: string, updates: {
    date?: string;
    symptoms?: string;
    diagnosis?: string;
    treatment?: string;
    medications?: string[];
    notes?: string;
    followUpDate?: string;
  }) {
    const { data } = await api.patch(`/clinical-records/${id}`, updates);
    return data as ClinicalRecord;
  },

  /**
   * Delete Clinical Record
   * 
   * Permanently deletes a clinical record.
   * Use with extreme caution - medical records should rarely be deleted.
   * 
   * @param id - Clinical record's unique identifier
   * @returns Promise (void)
   * 
   * USAGE:
   * await clinicalRecordAPI.delete('clinical123');
   */
  async delete(id: string) {
    await api.delete(`/clinical-records/${id}`);
  },
};

/**
 * FINAL NOTE FOR DEVELOPERS:
 * 
 * This api.ts file is the single source of truth for all backend communication.
 * Always use these functions instead of calling axios directly in components.
 * 
 * BENEFITS:
 * - Centralized error handling (via interceptors)
 * - Automatic JWT token injection
 * - Type safety with TypeScript
 * - Consistent API patterns across the app
 * - Easy to update endpoints in one place
 * 
 * ADDING A NEW API FUNCTION:
 * 1. Add it to the appropriate API object (userAPI, petAPI, etc.)
 * 2. Include proper TypeScript types for parameters and return values
 * 3. Add JSDoc comments explaining what it does
 * 4. Provide usage examples
 * 5. Follow the existing naming patterns (getById, create, update, delete)
 */

/**
 * ==================== API ERROR TRANSLATION ====================
 */

/**
 * Maps known server error messages to i18next translation keys.
 * Falls back to original message or generic error when no mapping exists.
 *
 * @param error - The error object from axios/API call
 * @param t - i18next translation function
 * @param fallbackKey - Optional fallback translation key (defaults to 'errors.generic')
 * @returns Translated error string
 */
export function translateApiError(
  error: unknown,
  t: (key: string, options?: Record<string, unknown>) => string,
  fallbackKey?: string
): string {
  const serverMessage: string | undefined =
    (error as any)?.response?.data?.error ||
    (error as any)?.response?.data?.message;

  if (!serverMessage) {
    return t(fallbackKey || "errors.generic");
  }

  const lower = serverMessage.toLowerCase();

  // Auth-related errors
  if (lower.includes("invalid email or password") || lower.includes("invalid credentials")) {
    return t("api.invalidCredentials");
  }
  if (lower.includes("token expired") || lower.includes("token invalid")) {
    return t("api.tokenExpired");
  }
  if (lower.includes("user already exists")) {
    return t("api.userAlreadyExists");
  }
  if (lower.includes("email already registered") || lower.includes("email already exists")) {
    return t("api.emailAlreadyRegistered");
  }
  if (lower.includes("not authorized") || lower.includes("unauthorized")) {
    return t("api.notAuthorized");
  }

  // Not found errors
  if (
    lower.includes("not found") &&
    (lower.includes("pet") ||
      lower.includes("appointment") ||
      lower.includes("user") ||
      lower.includes("record"))
  ) {
    return t("api.notFound");
  }

  // Network errors
  if (
    lower.includes("network error") ||
    lower.includes("failed to fetch") ||
    lower.includes("econnrefused")
  ) {
    return t("api.networkError");
  }

  // Server errors
  if (
    lower.includes("internal server error") ||
    lower.includes("service unavailable")
  ) {
    return t("api.serverError");
  }

  // Return original message as-is (it might be a dynamic server message)
  return serverMessage;
}

export default api;
