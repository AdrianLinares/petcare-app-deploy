/**
 * Notification Helpers
 * 
 * BEGINNER EXPLANATION:
 * This file contains utility functions to easily send notifications
 * from anywhere in the backend code (serverless functions).
 * 
 * Use Cases:
 * - Send welcome notification when user registers
 * - Send appointment reminder 24 hours before appointment
 * - Send notification when appointment is cancelled/rescheduled
 * - Send overdue vaccination reminders
 * - Send password change security alerts
 * 
 * How it Works:
 * 1. Import this helper in your serverless function
 * 2. Call the appropriate function (e.g., sendWelcomeNotification)
 * 3. Helper inserts notification into database
 * 4. Helper triggers Pusher broadcast (real-time delivery)
 * 5. User sees notification instantly in their NotificationBell
 * 
 * Example Usage:
 * ```typescript
 * import { sendAppointmentReminder } from './utils/notifications';
 * 
 * // After creating appointment
 * await sendAppointmentReminder(userId, appointmentDate, vetName);
 * ```
 */

import Pusher from 'pusher';
import { query } from './database';

// Cache Pusher instance
let pusher: Pusher | null = null;

/**
 * Get Pusher Instance
 * 
 * Lazily initializes Pusher connection.
 */
function getPusher(): Pusher | null {
    if (pusher) return pusher;

    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.PUSHER_CLUSTER || 'us2';

    if (!appId || !key || !secret) {
        console.warn('Pusher not configured. Notifications will be database-only.');
        return null;
    }

    pusher = new Pusher({
        appId,
        key,
        secret,
        cluster,
        useTLS: true,
    });

    return pusher;
}

/**
 * Send Notification (Base Function)
 * 
 * Generic function to create and broadcast any notification.
 * Other functions in this file are wrappers around this.
 * 
 * @param userId - User to receive notification
 * @param type - Notification type
 * @param title - Notification title
 * @param message - Notification message
 * @param priority - Priority level (default: normal). Supported: low/normal/high.
 *   Note: "urgent" is reserved for future schema support.
 */
export async function sendNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
): Promise<void> {
    try {
        // Insert into database
        const result = await query(
            `INSERT INTO notifications (user_id, type, title, message, priority, read)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING *`,
            [userId, type, title, message, priority]
        );

        const notification = {
            id: result.rows[0].id,
            userId: result.rows[0].user_id,
            type: result.rows[0].type,
            title: result.rows[0].title,
            message: result.rows[0].message,
            priority: result.rows[0].priority,
            read: result.rows[0].read,
            createdAt: result.rows[0].created_at,
        };

        // Broadcast via Pusher
        const pusherInstance = getPusher();
        if (pusherInstance) {
            await pusherInstance.trigger(
                `user-${userId}`,
                'notification-created',
                notification
            );
            console.log(`✅ Notification sent to user ${userId}: ${title}`);
        } else {
            console.log(`📝 Notification saved to DB for user ${userId}: ${title} (no real-time)`);
        }
    } catch (error) {
        console.error('Failed to send notification:', error);
        // Don't throw - notification failure shouldn't break the main flow
    }
}

/**
 * Send Welcome Notification
 * 
 * Sent when user first registers.
 */
export async function sendWelcomeNotification(userId: string, userName: string): Promise<void> {
    await sendNotification(
        userId,
        'welcome',
        'Welcome to PetCare! 🐾',
        `Hi ${userName}! Thanks for joining PetCare. We're excited to help you care for your pets.`,
        'normal'
    );
}

/**
 * Send Appointment Reminder
 * 
 * Sent 24 hours before appointment.
 */
export async function sendAppointmentReminder(
    userId: string,
    appointmentDate: string,
    appointmentTime: string,
    veterinarianName: string,
    petName: string
): Promise<void> {
    await sendNotification(
        userId,
        'appointment_reminder',
        'Upcoming Appointment Reminder',
        `Reminder: ${petName} has an appointment with ${veterinarianName} tomorrow at ${appointmentTime}.`,
        'high'
    );
}

/**
 * Send Appointment Cancelled Notification
 */
export async function sendAppointmentCancelled(
    userId: string,
    appointmentDate: string,
    veterinarianName: string,
    petName: string
): Promise<void> {
    await sendNotification(
        userId,
        'appointment_cancelled',
        'Appointment Cancelled',
        `Your appointment for ${petName} with ${veterinarianName} on ${appointmentDate} has been cancelled.`,
        'normal'
    );
}

/**
 * Send Appointment Rescheduled Notification
 */
export async function sendAppointmentRescheduled(
    userId: string,
    oldDate: string,
    newDate: string,
    petName: string
): Promise<void> {
    await sendNotification(
        userId,
        'appointment_rescheduled',
        'Appointment Rescheduled',
        `Your appointment for ${petName} has been rescheduled from ${oldDate} to ${newDate}.`,
        'normal'
    );
}

/**
 * Send Vaccination Due Notification
 */
export async function sendVaccinationDue(
    userId: string,
    petName: string,
    vaccineName: string,
    dueDate: string
): Promise<void> {
    await sendNotification(
        userId,
        'vaccination_due',
        'Vaccination Due',
        `${petName}'s ${vaccineName} vaccination is due on ${dueDate}. Please schedule an appointment.`,
        'high'
    );
}

/**
 * Send Medication Reminder
 */
export async function sendMedicationReminder(
    userId: string,
    petName: string,
    medicationName: string
): Promise<void> {
    await sendNotification(
        userId,
        'medication_reminder',
        'Medication Reminder',
        `Time to give ${petName} their ${medicationName} medication.`,
        'normal'
    );
}

/**
 * Send Medical Update Notification
 * 
 * Sent when vet adds/updates clinical records.
 */
export async function sendMedicalUpdate(
    userId: string,
    petName: string,
    veterinarianName: string
): Promise<void> {
    await sendNotification(
        userId,
        'medical_update',
        'Medical Record Updated',
        `${veterinarianName} has updated ${petName}'s medical records. View them in your dashboard.`,
        'normal'
    );
}

/**
 * Send Password Changed Notification
 * 
 * Security alert when password is changed.
 */
export async function sendPasswordChanged(userId: string, userEmail: string): Promise<void> {
    await sendNotification(
        userId,
        'password_changed',
        'Password Changed',
        `Your password for ${userEmail} was recently changed. If this wasn't you, please contact support immediately.`,
        'urgent'
    );
}

/**
 * Send System Alert
 * 
 * For maintenance notifications, feature announcements, etc.
 */
export async function sendSystemAlert(
    userId: string,
    title: string,
    message: string,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
): Promise<void> {
    await sendNotification(userId, 'system_alert', title, message, priority);
}
