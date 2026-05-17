# Real-Time Notifications Setup Guide

## Overview

PetCare now supports **real-time notifications** powered by [Pusher](https://pusher.com). Users receive instant notifications for:

- Welcome messages on registration
- Password changes (security alerts)

Other notification types (appointments, vaccinations, medical updates, system alerts) are available via helpers but are not wired automatically yet.

## Architecture

### Backend (Netlify Functions)
- **Notifications Function** ([`netlify/functions/notifications.ts`](netlify/functions/notifications.ts))
  - Full CRUD API for notifications
  - Broadcasts new notifications via Pusher
  - Endpoint: `POST /api/notifications` triggers real-time delivery

- **Notification Helpers** ([`netlify/functions/utils/notifications.ts`](netlify/functions/utils/notifications.ts))
  - Pre-built functions for common notification types
  - Example: `sendWelcomeNotification(userId, userName)`
  - Automatically saves to DB and broadcasts via Pusher

### Frontend (React)
- **NotificationBell Component** ([`frontend/src/components/Notification/NotificationBell.tsx`](frontend/src/components/Notification/NotificationBell.tsx))
  - Bell icon with unread count badge
  - Dropdown list of recent notifications
  - Mark as read, delete, mark all as read
  - Real-time updates via Pusher

- **usePusher Hook** ([`frontend/src/hooks/use-pusher.ts`](frontend/src/hooks/use-pusher.ts))
  - Manages Pusher connection
  - Subscribes to user-specific channel: `user-{userId}`
  - Listens for `notification-created` events

## Setup Instructions

### 1. Create Pusher Account

1. Go to [https://dashboard.pusher.com](https://dashboard.pusher.com)
2. Sign up for a free account
3. Create a new "Channels" app
4. Note your credentials:
   - **App ID** (e.g., `1234567`)
   - **Key** (e.g., `abc123def456`)
   - **Secret** (e.g., `xyz789uvw012`)
   - **Cluster** (e.g., `us2`, `eu`, `ap1`)

### 2. Configure Environment Variables

#### Backend Variables (Netlify Serverless Functions)

Add these to your `.env` file (local) and Netlify environment (production):

```bash
# Pusher Configuration
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_app_key
PUSHER_SECRET=your_app_secret
PUSHER_CLUSTER=us2
```

**Set in Netlify CLI:**
```bash
npx netlify env:set PUSHER_APP_ID your_app_id
npx netlify env:set PUSHER_KEY your_app_key
npx netlify env:set PUSHER_SECRET your_app_secret
npx netlify env:set PUSHER_CLUSTER us2
```

**Set in Netlify Dashboard:**
- Go to Site Settings → Environment Variables
- Add each variable above

#### Frontend Variables (Vite)

Add to `frontend/.env` (local development):
```bash
VITE_PUSHER_KEY=your_app_key
VITE_PUSHER_CLUSTER=us2
```

**Note:** `VITE_PUSHER_KEY` and `VITE_PUSHER_CLUSTER` are **public** and safe to expose in client-side code. Never expose `PUSHER_SECRET` in the frontend.

For **production**, set these in your build environment or commit them to `frontend/.env.production` (they are public values).

### 3. Install Dependencies

Already installed if you've run `npm run install:all`. If not:

```bash
# Backend
cd netlify/functions
npm install pusher

# Frontend
cd frontend
npm install pusher-js
```

### 4. Test Notifications

#### Local Development

1. Start Netlify Dev:
   ```bash
   npm run dev
   ```

2. Register a new user or log in

3. Open browser DevTools Console

4. Look for Pusher connection logs:
   ```
   ✅ Pusher connected
   ✅ Successfully subscribed to user-abc123
   ```

5. Trigger a notification (e.g., register a new user)

6. Watch for:
   - Console log: `📬 New notification received`
   - Toast popup appears
   - Bell icon shows badge count
   - Notification appears in dropdown

#### Production Testing

1. Deploy to Netlify:
   ```bash
   npx netlify deploy --prod
   ```

2. Ensure environment variables are set (see step 2)

3. Test registration, password reset, or appointment creation

4. Verify notifications appear in real-time

## Usage Guide for Developers

### Sending Notifications from Backend

Use the helper functions in [`utils/notifications.ts`](netlify/functions/utils/notifications.ts):

```typescript
import { sendWelcomeNotification, sendAppointmentReminder } from './utils/notifications';

// Welcome notification on registration
await sendWelcomeNotification(user.id, user.fullName);

// Appointment reminder
await sendAppointmentReminder(
  userId,
  appointmentDate,
  appointmentTime,
  veterinarianName,
  petName
);
```

#### Available Helpers

- `sendWelcomeNotification(userId, userName)`
- `sendAppointmentReminder(userId, date, time, vetName, petName)`
- `sendAppointmentCancelled(userId, date, vetName, petName)`
- `sendAppointmentRescheduled(userId, oldDate, newDate, petName)`
- `sendVaccinationDue(userId, petName, vaccineName, dueDate)`
- `sendMedicationReminder(userId, petName, medicationName)`
- `sendMedicalUpdate(userId, petName, vetName)`
- `sendPasswordChanged(userId, userEmail)`
- `sendSystemAlert(userId, title, message, priority)`

### Creating Custom Notifications

```typescript
import { sendNotification } from './utils/notifications';

await sendNotification(
  userId,
  'custom_type',
  'Notification Title',
  'Notification message goes here',
  'high' // priority: low, normal, high
);
```

### Frontend Integration

The `NotificationBell` component is already integrated in all three dashboards:

- [`PetOwnerDashboard`](frontend/src/components/Dashboard/PetOwnerDashboard.tsx)
- [`VeterinarianDashboard`](frontend/src/components/Dashboard/VeterinarianDashboard.tsx)
- [`AdminDashboard`](frontend/src/components/Dashboard/AdminDashboard.tsx)

To add it elsewhere:

```tsx
import NotificationBell from '@/components/Notification/NotificationBell';

<NotificationBell userId={currentUser.id} />
```

## Notification Types

Only `welcome` and `password_changed` are triggered automatically in the current build. Other types are available when you call the helper functions manually.

| Type                      | Priority | Description                              |
|---------------------------|----------|------------------------------------------|
| `welcome`                 | normal   | New user registration                    |
| `appointment_reminder`    | high     | 24 hours before appointment              |
| `appointment_cancelled`   | normal   | Appointment cancelled                    |
| `appointment_rescheduled` | normal   | Appointment date/time changed            |
| `vaccination_due`         | high     | Vaccination due or overdue               |
| `medication_reminder`     | normal   | Medication administration reminder       |
| `medical_update`          | normal   | Vet updated medical records              |
| `password_changed`        | high     | Security alert for password change       |
| `system_alert`            | low/normal/high | System maintenance, feature announcements|

## Database Schema

Notifications are stored in the `notifications` table (already exists):

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100),
    title VARCHAR(255),
    message TEXT,
    priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Troubleshooting

### Pusher Not Connecting

**Symptoms:**
- Console logs: `Pusher not configured. Real-time notifications disabled.`
- No real-time updates (notifications only in DB)

**Fix:**
1. Verify environment variables are set (both backend and frontend)
2. Check Pusher dashboard for app status
3. Ensure `VITE_PUSHER_KEY` matches backend `PUSHER_KEY`
4. Restart dev server after changing env vars

### Notifications Not Appearing

**Symptoms:**
- Pusher connected but no notifications in dropdown
- Bell icon shows no badge

**Fix:**
1. Check browser console for errors
2. Verify API endpoint is working: `GET /api/notifications`
3. Check database: `SELECT * FROM notifications WHERE user_id = 'your_user_id';`
4. Ensure user is logged in and `userId` is correct

### Real-Time Not Working (DB Only)

**Symptoms:**
- Notifications appear after page refresh
- No real-time updates

**Fix:**
1. Verify Pusher credentials in backend `.env`
2. Check Netlify environment variables are set
3. Redeploy: `npx netlify deploy --prod`
4. Check Netlify function logs: `npx netlify logs:function notifications`

### TypeScript Errors

If you see `Cannot find module '@/hooks/use-pusher'`:

1. Restart TypeScript server in VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server"
2. Rebuild: `cd frontend && npm run build`

## Security Notes

- ✅ **Pusher Key** is safe to expose in frontend (public)
- ❌ **Pusher Secret** must NEVER be exposed (backend only)
- ✅ Notifications are user-specific via `user-{userId}` channels
- ✅ Backend validates user identity before creating notifications
- ✅ Frontend only subscribes to own channel (JWT auth ensures correct userId)

## Performance Considerations

- **Connection pooling:** Pusher instance is cached in backend
- **Channel limits:** Each user has their own channel
- **Rate limits:** Pusher free tier: 200k messages/day, 100 concurrent connections
- **Database cleanup:** Consider deleting old read notifications (>30 days) periodically

## Future Enhancements

- [ ] Email notifications for high priority
- [ ] Browser push notifications (Web Push API)
- [ ] SMS notifications via Twilio
- [ ] Notification preferences (user can mute certain types)
- [ ] Batch notifications for multiple users
- [ ] Notification history/archive page
- [ ] Daily digest emails

## Resources

- [Pusher Channels Documentation](https://pusher.com/docs/channels)
- [Pusher JavaScript Quick Start](https://pusher.com/docs/channels/getting_started/javascript)
- [Netlify Functions Guide](https://docs.netlify.com/functions/overview/)
- [PetCare Project README](../README.md)
