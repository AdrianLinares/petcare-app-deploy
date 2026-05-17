/**
 * Notifications Serverless Function
 * 
 * BEGINNER EXPLANATION:
 * This function manages user notifications. It's like an inbox that shows
 * important messages, reminders, and system updates to users.
 * 
 * API Endpoints:
 * GET    /notifications                - Get user's notifications
 * GET    /notifications/unread-count   - Get count of unread notifications
 * POST   /notifications                - Create new notification (triggers Pusher broadcast)
 * PATCH  /notifications/:id/read       - Mark notification as read
 * PATCH  /notifications/read-all       - Mark all notifications as read
 * DELETE /notifications/:id            - Delete notification
 * 
 * Notification Structure:
 * - userId: Who should receive this notification
 * - type: Category (welcome, appointment, reminder, system, alert)
 * - title: Short headline (e.g., "Appointment Scheduled")
 * - message: Detailed message content
 * - priority: Importance level (low, normal, high)
 * - read: Whether user has seen it (boolean)
 * - createdAt: When notification was created
 * 
 * Notification Types:
 * - welcome: Sent when user first registers
 * - appointment_reminder: Upcoming appointment alerts
 * - appointment_cancelled: Cancelled appointment notifications
 * - appointment_rescheduled: Rescheduled appointment notifications
 * - vaccination_due: Vaccination reminders
 * - medication_reminder: Medication refill reminders
 * - medical_update: Medical record updates
 * - system_alert: System maintenance, updates
 * - password_changed: Security notification
 * 
 * Priority Levels:
 * - low: General information, can be ignored
 * - normal: Standard notifications
 * - high: Important, should be addressed
 * Note: The database schema currently supports low/normal/high.
 * 
 * Read Status:
 * - read = false: New, unread notification (shows badge/highlight)
 * - read = true: User has viewed the notification
 * 
 * Real-Time Delivery:
 * Uses Pusher to broadcast new notifications instantly to connected clients.
 * When a notification is created, it publishes to channel: `user-{userId}`
 * Event: `notification-created`
 * 
 * Automatic Notifications:
 * System automatically creates notifications for:
 * - New user registration (welcome message)
 * - Password changes
 * Other notification types are created only when explicitly requested.
 * 
 * Future Enhancements:
 * - Email integration (send important notifications via email)
 * - Push notifications (browser/mobile push)
 * - SMS alerts for urgent matters
 * - Configurable notification preferences
 * - Notification categories for filtering
 */

import { Handler, HandlerEvent } from '@netlify/functions';
import Pusher from 'pusher';
import { query } from './utils/database';
import { requireAuth } from './utils/auth';
import { successResponse, errorResponse, corsResponse } from './utils/response';

/**
 * Initialize Pusher for real-time broadcasts
 * 
 * BEGINNER EXPLANATION:
 * Pusher is a service that lets us send real-time updates to connected clients.
 * When we create a notification here, Pusher instantly sends it to the user's
 * browser without requiring a page refresh or polling.
 * 
 * Configuration:
 * - appId: Your Pusher application ID
 * - key: Public key (safe to expose)
 * - secret: Private key (NEVER expose in frontend)
 * - cluster: Geographic region (e.g., 'us2', 'eu')
 * 
 * Get credentials at: https://dashboard.pusher.com
 */
let pusher: Pusher | null = null;

/**
 * Get Pusher Instance
 * 
 * Lazily initializes Pusher connection. Only creates instance when needed
 * to avoid unnecessary connections in environments where it's not configured.
 */
function getPusher(): Pusher | null {
  if (pusher) return pusher;

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER || 'us2';

  if (!appId || !key || !secret) {
    console.warn('Pusher credentials not configured. Real-time notifications disabled.');
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
 * Map Database Row to Frontend Format
 * 
 * Converts database snake_case fields to camelCase format expected by frontend.
 */
function mapNotification(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    priority: row.priority,
    read: row.read,
    createdAt: row.created_at,
  };
}

/**
 * Broadcast Notification via Pusher
 * 
 * BEGINNER EXPLANATION:
 * Sends notification to user's browser in real-time.
 * Channel naming: `user-{userId}` ensures only the intended user receives it.
 * Event: `notification-created` tells the frontend what type of update it is.
 * 
 * @param notification - Notification object to broadcast
 */
async function broadcastNotification(notification: any): Promise<void> {
  const pusherInstance = getPusher();
  if (!pusherInstance) {
    console.log('Pusher not configured. Skipping real-time broadcast.');
    return;
  }

  try {
    await pusherInstance.trigger(
      `user-${notification.userId}`,  // Private channel for specific user
      'notification-created',          // Event name
      notification                     // Payload
    );
    console.log(`Notification broadcast to user ${notification.userId}`);
  } catch (error) {
    console.error('Failed to broadcast notification:', error);
    // Don't throw - notification is still saved in DB
  }
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') return corsResponse();

  try {
    const path = event.path.replace('/.netlify/functions/notifications', '').replace('/api/notifications', '');
    const body = event.body ? JSON.parse(event.body) : {};
    const params = event.queryStringParameters || {};
    const user = await requireAuth(event);

    // GET /notifications - Get user's notifications
    if (path === '' && event.httpMethod === 'GET') {
      const unreadOnly = params.unreadOnly === 'true';

      let queryText = 'SELECT * FROM notifications WHERE user_id = $1';
      if (unreadOnly) {
        queryText += ' AND read = false';
      }
      queryText += ' ORDER BY created_at DESC LIMIT 100'; // Limit to recent 100

      const result = await query(queryText, [user.id]);
      return successResponse(result.rows.map(mapNotification));
    }

    // GET /notifications/unread-count - Get count of unread notifications
    if (path === '/unread-count' && event.httpMethod === 'GET') {
      const result = await query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
        [user.id]
      );
      return successResponse({ count: parseInt(result.rows[0].count) });
    }

    // POST /notifications - Create new notification
    if (path === '' && event.httpMethod === 'POST') {
      const { userId, type, title, message, priority } = body;

      // Validate required fields
      if (!userId || !type || !title || !message) {
        throw new Error('Missing required fields: userId, type, title, message');
      }

      // Validate type
      const validTypes = [
        'welcome', 'appointment_reminder', 'appointment_cancelled', 'appointment_rescheduled',
        'vaccination_due', 'medication_reminder', 'medical_update', 'system_alert', 'password_changed'
      ];
      if (!validTypes.includes(type)) {
        throw new Error(`Invalid notification type. Must be one of: ${validTypes.join(', ')}`);
      }

      // Validate priority (if provided)
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      const finalPriority = priority || 'normal';
      if (!validPriorities.includes(finalPriority)) {
        throw new Error(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
      }

      // Insert notification into database
      const result = await query(
        `INSERT INTO notifications (user_id, type, title, message, priority, read)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING *`,
        [userId, type, title, message, finalPriority]
      );

      const notification = mapNotification(result.rows[0]);

      // Broadcast to user in real-time
      await broadcastNotification(notification);

      return successResponse(notification, 201);
    }

    // Handle /:id routes
    const idMatch = path.match(/^\/([^\/]+)(\/.*)?$/);
    if (idMatch) {
      const notificationId = idMatch[1];
      const subPath = idMatch[2] || '';

      // PATCH /notifications/:id/read - Mark as read
      if (subPath === '/read' && event.httpMethod === 'PATCH') {
        // Verify notification belongs to user
        const checkResult = await query(
          'SELECT user_id FROM notifications WHERE id = $1',
          [notificationId]
        );

        if (checkResult.rows.length === 0) {
          throw new Error('Notification not found');
        }

        if (checkResult.rows[0].user_id !== user.id && user.userType !== 'administrator') {
          throw new Error('Unauthorized');
        }

        // Update read status
        await query(
          'UPDATE notifications SET read = true WHERE id = $1',
          [notificationId]
        );

        return successResponse({ message: 'Notification marked as read' });
      }

      // DELETE /notifications/:id - Delete notification
      if (subPath === '' && event.httpMethod === 'DELETE') {
        // Verify notification belongs to user
        const checkResult = await query(
          'SELECT user_id FROM notifications WHERE id = $1',
          [notificationId]
        );

        if (checkResult.rows.length === 0) {
          throw new Error('Notification not found');
        }

        if (checkResult.rows[0].user_id !== user.id && user.userType !== 'administrator') {
          throw new Error('Unauthorized');
        }

        // Permanently delete notification
        await query('DELETE FROM notifications WHERE id = $1', [notificationId]);

        return successResponse({ message: 'Notification deleted' });
      }
    }

    // PATCH /notifications/read-all - Mark all as read
    if (path === '/read-all' && event.httpMethod === 'PATCH') {
      await query(
        'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false',
        [user.id]
      );

      return successResponse({ message: 'All notifications marked as read' });
    }

    throw new Error('Not found');
  } catch (error: any) {
    console.error('Notifications function error:', error);
    return errorResponse(error);
  }
};

export { handler };
