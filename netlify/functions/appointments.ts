/**
 * Appointments Serverless Function
 * 
 * BEGINNER EXPLANATION:
 * This function manages veterinary appointments. It's like an online booking
 * system that handles scheduling, viewing, and managing vet appointments.
 * 
 * API Endpoints:
 * GET    /appointments       - List appointments (filtered by role)
 * POST   /appointments       - Create new appointment
 * GET    /appointments/:id   - Get specific appointment
 * PATCH  /appointments/:id   - Update appointment (status, medical notes)
 * DELETE /appointments/:id   - Cancel appointment (soft delete)
 * 
 * Role-Based Filtering:
 * - Pet Owners: See only appointments for their pets
 * - Veterinarians: See only appointments assigned to them
 * - Administrators: See ALL appointments
 * 
 * Appointment Statuses:
 * - scheduled: Appointment is confirmed and upcoming
 * - completed: Appointment happened and is finished
 * - cancelled: Appointment was cancelled
 * 
 * Query Parameters (GET /appointments):
 * - status: Filter by appointment status
 * - date: Filter by specific date (YYYY-MM-DD)
 * - petId: Filter by specific pet
 * 
 * Update Limitations:
 * Current API allows updating:
 * - status (scheduled/completed/cancelled)
 * - Medical notes (diagnosis, treatment, notes, followUpDate)
 * 
 * NOT currently supported:
 * - Changing appointment date/time (would need separate reschedule endpoint)
 * 
 * Database Joins:
 * Appointment query joins 3 tables:
 * - appointments: Main appointment data
 * - pets: Get pet name
 * - users (twice): Get owner name AND veterinarian name
 * 
 * Soft Delete Pattern:
 * Cancelled appointments aren't removed - we set deleted_at timestamp.
 * This preserves history for record-keeping and analytics.
 */

import { Handler, HandlerEvent } from '@netlify/functions';
import { query } from './utils/database';
import { requireAuth } from './utils/auth';
import { successResponse, errorResponse, corsResponse } from './utils/response';

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') return corsResponse();

  try {
    const path = event.path.replace('/.netlify/functions/appointments', '').replace('/api/appointments', '');
    const body = event.body ? JSON.parse(event.body) : {};
    const params = event.queryStringParameters || {};
    const user = await requireAuth(event);

    // GET /appointments
    if (path === '' && event.httpMethod === 'GET') {
      let queryText = `SELECT a.*, p.name as pet_name, u1.full_name as owner_name, u2.full_name as vet_name
                       FROM appointments a
                       JOIN pets p ON a.pet_id = p.id
                       JOIN users u1 ON a.owner_id = u1.id
                       JOIN users u2 ON a.veterinarian_id = u2.id
                       WHERE a.deleted_at IS NULL`;
      const values: any[] = [];
      let paramCount = 1;

      if (user.userType === 'pet_owner') {
        queryText += ` AND a.owner_id = $${paramCount++}`;
        values.push(user.id);
      } else if (user.userType === 'veterinarian') {
        queryText += ` AND a.veterinarian_id = $${paramCount++}`;
        values.push(user.id);
      }

      if (params.status) {
        queryText += ` AND a.status = $${paramCount++}`;
        values.push(params.status);
      }

      if (params.date) {
        queryText += ` AND DATE(a.date) = $${paramCount++}`;
        values.push(params.date);
      }

      if (params.petId) {
        queryText += ` AND a.pet_id = $${paramCount++}`;
        values.push(params.petId);
      }

      queryText += ' ORDER BY a.date ASC';

      const result = await query(queryText, values);
      return successResponse(result.rows.map((apt: any) => ({
        id: apt.id,
        petId: apt.pet_id,
        petName: apt.pet_name,
        ownerId: apt.owner_id,
        ownerName: apt.owner_name,
        veterinarianId: apt.veterinarian_id,
        veterinarianName: apt.vet_name,
        type: apt.appointment_type,
        date: apt.date,
        time: apt.time,
        duration: apt.duration,
        reason: apt.reason,
        status: apt.status,
        notes: apt.notes,
        createdAt: apt.created_at,
        updatedAt: apt.updated_at,
      })));
    }

    // POST /appointments
    if (path === '' && event.httpMethod === 'POST') {
      const { petId, veterinarianId, type, date, time, reason } = body;

      if (!petId || !veterinarianId || !type || !date || !time) {
        throw new Error('Missing required fields');
      }

      // Get pet owner
      const petResult = await query('SELECT owner_id FROM pets WHERE id = $1', [petId]);
      if (petResult.rows.length === 0) {
        throw new Error('Pet not found');
      }

      const ownerId = petResult.rows[0].owner_id;

      const result = await query(
        `INSERT INTO appointments (pet_id, owner_id, veterinarian_id, appointment_type, date, time, reason, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [petId, ownerId, veterinarianId, type, date, time, reason || null, 'scheduled']
      );

      return successResponse(result.rows[0], 201);
    }

    // Handle /:id routes
    const idMatch = path.match(/^\/([^\/]+)$/);
    if (idMatch) {
      const appointmentId = idMatch[1];

      // GET /appointments/:id
      if (event.httpMethod === 'GET') {
        const result = await query(
          `SELECT a.*, p.name as pet_name, u1.full_name as owner_name, u2.full_name as vet_name
           FROM appointments a
           JOIN pets p ON a.pet_id = p.id
           JOIN users u1 ON a.owner_id = u1.id
           JOIN users u2 ON a.veterinarian_id = u2.id
           WHERE a.id = $1 AND a.deleted_at IS NULL`,
          [appointmentId]
        );

        if (result.rows.length === 0) {
          throw new Error('Appointment not found');
        }

        return successResponse(result.rows[0]);
      }

      // PATCH /appointments/:id
      if (event.httpMethod === 'PATCH') {
        const { date, time, status, notes, type, reason } = body;

        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (date) {
          updates.push(`date = $${paramCount++}`);
          values.push(date);
        }
        if (time) {
          updates.push(`time = $${paramCount++}`);
          values.push(time);
        }
        if (status) {
          updates.push(`status = $${paramCount++}`);
          values.push(status);
        }
        if (notes !== undefined) {
          updates.push(`notes = $${paramCount++}`);
          values.push(notes);
        }
        if (type) {
          updates.push(`appointment_type = $${paramCount++}`);
          values.push(type);
        }
        if (reason !== undefined) {
          updates.push(`reason = $${paramCount++}`);
          values.push(reason);
        }

        if (updates.length === 0) {
          throw new Error('No fields to update');
        }

        values.push(appointmentId);

        const result = await query(
          `UPDATE appointments SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
           WHERE id = $${paramCount} AND deleted_at IS NULL
           RETURNING *`,
          values
        );

        if (result.rows.length === 0) {
          throw new Error('Appointment not found');
        }

        return successResponse(result.rows[0]);
      }

      // DELETE /appointments/:id
      if (event.httpMethod === 'DELETE') {
        await query('UPDATE appointments SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [appointmentId]);
        return successResponse({ message: 'Appointment deleted successfully' });
      }
    }

    return errorResponse(new Error('Route not found'), 404);
  } catch (error: any) {
    return errorResponse(error);
  }
};

export { handler };
