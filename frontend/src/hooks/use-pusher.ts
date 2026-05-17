/**
 * Pusher Hook
 * 
 * BEGINNER EXPLANATION:
 * This custom React hook manages the Pusher connection for real-time notifications.
 * It handles:
 * - Connecting to Pusher when component mounts
 * - Subscribing to user-specific notification channel
 * - Listening for new notifications
 * - Cleaning up connection when component unmounts
 * 
 * Usage:
 * ```tsx
 * const { onNotificationReceived } = usePusher(userId);
 * 
 * useEffect(() => {
 *   const unsubscribe = onNotificationReceived((notification) => {
 *     console.log('New notification:', notification);
 *   });
 *   return unsubscribe;
 * }, [onNotificationReceived]);
 * ```
 * 
 * Environment Variables Required:
 * - VITE_PUSHER_KEY: Public Pusher key (safe to expose)
 * - VITE_PUSHER_CLUSTER: Pusher cluster (e.g., 'us2', 'eu')
 * 
 * Channel Naming:
 * - Subscribes to `user-{userId}` channel
 * - Ensures only the specific user receives their notifications
 * 
 * Events:
 * - `notification-created`: Fired when a new notification is created
 */

import { useEffect, useRef, useCallback } from 'react';
import Pusher from 'pusher-js';
import { Notification } from '@/types';

// Enable Pusher logging in development
if (import.meta.env.DEV) {
    Pusher.logToConsole = true;
}

type NotificationCallback = (notification: Notification) => void;

/**
 * usePusher Hook
 * 
 * Manages Pusher connection and notification subscriptions.
 * 
 * @param userId - Current user's ID for channel subscription
 * @returns Object with `onNotificationReceived` callback registration
 */
export function usePusher(userId: string) {
    const pusherRef = useRef<Pusher | null>(null);
    const channelRef = useRef<any>(null);
    const callbacksRef = useRef<Set<NotificationCallback>>(new Set());

    /**
     * Initialize Pusher Connection
     * 
     * Creates Pusher instance and subscribes to user's notification channel.
     * Only initializes once per userId.
     */
    useEffect(() => {
        const pusherKey = import.meta.env.VITE_PUSHER_KEY;
        const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER || 'us2';

        if (!pusherKey) {
            console.warn('Pusher key not configured. Real-time notifications disabled.');
            return;
        }

        if (!userId) {
            console.warn('No userId provided to usePusher hook.');
            return;
        }

        // Create Pusher instance
        if (!pusherRef.current) {
            console.log('Initializing Pusher connection...');
            pusherRef.current = new Pusher(pusherKey, {
                cluster: pusherCluster,
            });

            // Connection state logging
            pusherRef.current.connection.bind('connected', () => {
                console.log('✅ Pusher connected');
            });

            pusherRef.current.connection.bind('disconnected', () => {
                console.log('❌ Pusher disconnected');
            });

            pusherRef.current.connection.bind('error', (err: any) => {
                console.error('❌ Pusher connection error:', err);
            });
        }

        // Subscribe to user's notification channel
        const channelName = `user-${userId}`;
        console.log(`Subscribing to Pusher channel: ${channelName}`);

        channelRef.current = pusherRef.current.subscribe(channelName);

        // Listen for notification events
        channelRef.current.bind('notification-created', (data: Notification) => {
            console.log('📬 New notification received:', data);

            // Notify all registered callbacks
            callbacksRef.current.forEach((callback) => {
                callback(data);
            });
        });

        channelRef.current.bind('pusher:subscription_succeeded', () => {
            console.log(`✅ Successfully subscribed to ${channelName}`);
        });

        channelRef.current.bind('pusher:subscription_error', (status: any) => {
            console.error(`❌ Subscription error for ${channelName}:`, status);
        });

        // Cleanup on unmount or userId change
        return () => {
            if (channelRef.current) {
                console.log(`Unsubscribing from ${channelName}`);
                channelRef.current.unbind_all();
                pusherRef.current?.unsubscribe(channelName);
                channelRef.current = null;
            }

            if (pusherRef.current) {
                console.log('Disconnecting Pusher');
                pusherRef.current.disconnect();
                pusherRef.current = null;
            }
        };
    }, [userId]);

    /**
     * Register Notification Callback
     * 
     * Allows components to register callbacks that will be invoked
     * when a new notification is received.
     * 
     * @param callback - Function to call when notification arrives
     * @returns Unsubscribe function to remove callback
     */
    const onNotificationReceived = useCallback((callback: NotificationCallback) => {
        callbacksRef.current.add(callback);

        // Return unsubscribe function
        return () => {
            callbacksRef.current.delete(callback);
        };
    }, []);

    return {
        onNotificationReceived,
    };
}
