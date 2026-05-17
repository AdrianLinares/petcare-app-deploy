/**
 * NotificationBell Component
 * 
 * BEGINNER EXPLANATION:
 * This component displays a notification bell icon with a badge showing
 * the number of unread notifications. When clicked, it opens a dropdown
 * showing recent notifications.
 * 
 * Features:
 * - Bell icon with unread count badge
 * - Dropdown list of recent notifications
 * - Mark individual notifications as read
 * - Mark all notifications as read
 * - Delete notifications
 * - Real-time updates via Pusher
 * - Priority-based styling (high, normal, low)
 *   Note: "urgent" is reserved for future schema support.
 * 
 * Visual States:
 * - Badge hidden when count = 0
 * - Badge shows number when count > 0
 * - Different colors for notification priorities
 * 
 * Used in: App navigation header (visible to all logged-in users)
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, X, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { notificationAPI } from '@/lib/api';
import { Notification } from '@/types';
import { toast } from 'sonner';
import { usePusher } from '@/hooks/use-pusher';

interface NotificationBellProps {
    userId: string;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
    const { t } = useTranslation();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Connect to Pusher for real-time updates
    const { onNotificationReceived } = usePusher(userId);

    /**
     * Load Notifications
     * 
     * Fetches recent notifications from the API.
     * Gets both read and unread notifications (limited to 50).
     */
    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data = await notificationAPI.getNotifications(false); // false = get all, not just unread
            setNotifications(data);

            // Count unread notifications
            const unread = data.filter(n => !n.read).length;
            setUnreadCount(unread);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Initial Load
     * 
     * Load notifications when component mounts.
     */
    useEffect(() => {
        loadNotifications();
    }, [userId]);

    /**
     * Real-Time Updates
     * 
     * When a new notification arrives via Pusher, add it to the list
     * and increment the unread count.
     */
    useEffect(() => {
        const unsubscribe = onNotificationReceived((notification: Notification) => {
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Show toast notification
            toast.info(notification.title, {
                description: notification.message,
            });
        });

        return unsubscribe;
    }, [onNotificationReceived]);

    /**
     * Mark as Read
     * 
     * Marks a single notification as read and updates UI.
     */
    const handleMarkAsRead = async (notification: Notification) => {
        if (notification.read) return; // Already read

        try {
            await notificationAPI.markAsRead(notification.id);

            // Update local state
            setNotifications(prev =>
                prev.map(n => (n.id === notification.id ? { ...n, read: true } : n))
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            toast.error(t('toast.failedMarkAsRead'));
        }
    };

    /**
     * Mark All as Read
     * 
     * Marks all notifications as read at once.
     */
    const handleMarkAllAsRead = async () => {
        try {
            await notificationAPI.markAllAsRead();

            // Update local state
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);

            toast.success(t('toast.allMarkedRead'));
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            toast.error(t('toast.failedMarkAllRead'));
        }
    };

    /**
     * Delete Notification
     * 
     * Permanently removes a notification.
     */
    const handleDelete = async (notificationId: string, wasRead: boolean) => {
        try {
            await notificationAPI.deleteNotification(notificationId);

            // Update local state
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            if (!wasRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }

            toast.success(t('toast.notificationDeleted'));
        } catch (error) {
            console.error('Failed to delete notification:', error);
            toast.error(t('toast.failedDeleteNotification'));
        }
    };

    /**
     * Get Priority Color
     * 
     * Returns Tailwind color class based on priority level.
     */
    const getPriorityColor = (priority: string): string => {
        switch (priority) {
            case 'urgent':
                return 'text-red-600 bg-red-50 border-red-200';
            case 'high':
                return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'normal':
                return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'low':
                return 'text-gray-600 bg-gray-50 border-gray-200';
            default:
                return 'text-blue-600 bg-blue-50 border-blue-200';
        }
    };

    /**
     * Format Date
     * 
     * Converts ISO date to relative time (e.g., "5 minutes ago").
     */
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return t('notification.justNow');
        if (diffMins < 60) return t('notification.minutesAgo', { minutes: diffMins });
        if (diffHours < 24) return t('notification.hoursAgo', { hours: diffHours });
        if (diffDays < 7) return t('notification.daysAgo', { days: diffDays });
        return date.toLocaleDateString();
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80 md:w-96">
                {/* Header */}
                <div className="flex items-center justify-between p-3 pb-2">
                    <h3 className="font-semibold text-sm">{t('notification.title')}</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllAsRead}
                            className="text-xs h-7"
                        >
                            {t('notification.markAllRead')}
                        </Button>
                    )}
                </div>

                <Separator />

                {/* Notification List */}
                <ScrollArea className="h-[400px]">
                    {loading ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            {t('notification.loading')}
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center">
                            <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                            <p className="text-sm text-muted-foreground">{t('notification.empty')}</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-3 hover:bg-muted/50 transition-colors ${!notification.read ? 'bg-blue-50/50' : ''
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        {/* Priority Indicator */}
                                        <div
                                            className={`w-1 rounded-full flex-shrink-0 ${notification.priority === 'urgent'
                                                    ? 'bg-red-500'
                                                    : notification.priority === 'high'
                                                        ? 'bg-orange-500'
                                                        : notification.priority === 'normal'
                                                            ? 'bg-blue-500'
                                                            : 'bg-gray-400'
                                                }`}
                                        />

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <p className="font-medium text-sm line-clamp-1">
                                                    {notification.title}
                                                </p>
                                                {!notification.read && (
                                                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                                                )}
                                            </div>

                                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                                {notification.message}
                                            </p>

                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDate(notification.createdAt)}
                                                </span>

                                                <div className="flex items-center gap-1">
                                                    {!notification.read && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 px-2 text-xs"
                                                            onClick={() => handleMarkAsRead(notification)}
                                                            title="Mark as read"
                                                        >
                                                            <Check className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                                                        onClick={() => handleDelete(notification.id, notification.read)}
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
