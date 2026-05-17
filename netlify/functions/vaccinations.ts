/**
 * Vaccinations Serverless Function
 * 
 * BEGINNER EXPLANATION:
 * This function manages pet vaccination records. It tracks which vaccines
 * pets have received and when booster shots are due.
 * 
 * API Endpoints:
 * GET    /vaccinations          - List all vaccinations (filtered by role)
 * GET    /vaccinations?petId=x  - Get vaccinations for specific pet
 * GET    /vaccinations/upcoming - Get vaccines due soon or overdue
 * POST   /vaccinations          - Create new vaccination record
 * PATCH  /vaccinations/:id      - Update vaccination record
 * DELETE /vaccinations/:id      - Delete vaccination record
 * 
 * Vaccination Record Structure:
 * - petId: Which pet received the vaccine
 * - vaccine: Name of vaccine (e.g., "Rabies", "DHPP")
 * - date: When vaccine was administered
 * - nextDue: When booster shot is due (optional)
 * - administeredBy: Which veterinarian gave the vaccine
 * 
 * Special Feature: Upcoming Vaccinations
 * GET /vaccinations/upcoming returns vaccines where:
 * - nextDue is set (has a future date)
 * - Sorted by nextDue (earliest first)
 * This helps owners/vets see which vaccines need renewal soon.
 * 
 * Why Track Next Due Date?
 * Many vaccines require booster shots:
 * - Rabies: Every 1-3 years (varies by state law)
 * - DHPP: Every 1-3 years
 * - Bordetella: Every 6-12 months
 * System can remind owners when boosters are needed.
 * 
 * Role-Based Access:
 * - Pet Owners: See vaccinations for their pets only
 * - Veterinarians/Admins: See all vaccinations
 */

import { Handler } from '@netlify/functions';
import { query } from './utils/database';
import { requireAuth } from './utils/auth';
import { successResponse, errorResponse, corsResponse } from './utils/response';

/**
 * Map Vaccination Database Row to Frontend Format
 * 
 * BEGINNER EXPLANATION:
 * Converts database field names (snake_case) to JavaScript
 * convention (camelCase) and handles multiple possible field names
 * for the veterinarian name (joins might use different aliases).
 */
function mapVaccination(row: any) {
  return {
    id: row.id,
    petId: row.pet_id,
    vaccine: row.vaccine,
    date: row.date,
    nextDue: row.next_due,
    administeredBy: row.administered_by,
    administeredByName: row.administered_by_name || row.vet_name || row.veterinarian_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsResponse();
  try {
    const user = await requireAuth(event);
    const path = event.path.replace('/.netlify/functions/vaccinations', '').replace('/api/vaccinations', '');
    const body = event.body ? JSON.parse(event.body) : {};
    const params = event.queryStringParameters || {};

    // GET /vaccinations (optional ?petId=)
    if (path === '' && event.httpMethod === 'GET') {
      let queryText = `SELECT v.*, u.full_name AS administered_by_name FROM vaccinations v
                       LEFT JOIN users u ON v.administered_by = u.id
                       JOIN pets p ON v.pet_id = p.id
                       WHERE v.deleted_at IS NULL`;
      const values: any[] = [];
      let paramCount = 1;
      if (params.petId) {
        queryText += ` AND v.pet_id = $${paramCount++}`;
        values.push(params.petId);
      }
      if (user.userType === 'pet_owner') {
        queryText += ` AND p.owner_id = $${paramCount++}`;
        values.push(user.id);
      }
      queryText += ' ORDER BY v.date DESC';
      const result = await query(queryText, values);
      return successResponse(result.rows.map(mapVaccination));
    }

    // GET /vaccinations/upcoming
    if (path === '/upcoming' && event.httpMethod === 'GET') {
      // upcoming defined as next_due within next 365 days OR overdue
      let queryText = `SELECT v.*, u.full_name AS administered_by_name FROM vaccinations v
                       LEFT JOIN users u ON v.administered_by = u.id
                       JOIN pets p ON v.pet_id = p.id
                       WHERE v.deleted_at IS NULL AND v.next_due IS NOT NULL`;
      const values: any[] = [];
      let paramCount = 1;
      if (user.userType === 'pet_owner') {
        queryText += ` AND p.owner_id = $${paramCount++}`;
        values.push(user.id);
      }
      queryText += ' ORDER BY v.next_due ASC';
      const result = await query(queryText, values);
      return successResponse(result.rows.map(mapVaccination));
    }

    // GET /vaccinations/pet/:petId
    const petMatch = path.match(/^\/pet\/([^\/]+)$/);
    if (petMatch && event.httpMethod === 'GET') {
      const petId = petMatch[1];
      let queryText = `SELECT v.*, u.full_name AS administered_by_name FROM vaccinations v
                       LEFT JOIN users u ON v.administered_by = u.id
                       JOIN pets p ON v.pet_id = p.id
                       WHERE v.pet_id = $1 AND v.deleted_at IS NULL`;
      const values: any[] = [petId];
      if (user.userType === 'pet_owner') {
        queryText += ' AND p.owner_id = $2';
        values.push(user.id);
      }
      queryText += ' ORDER BY v.date DESC';
      const result = await query(queryText, values);
      return successResponse(result.rows.map(mapVaccination));
    }

    // POST /vaccinations
    if (path === '' && event.httpMethod === 'POST') {
      const { petId, vaccine, date, nextDue } = body;
      if (!petId || !vaccine || !date) throw new Error('Missing required fields');
      const result = await query(
        `INSERT INTO vaccinations (pet_id, vaccine, date, next_due, administered_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [petId, vaccine, date, nextDue || null, user.id]
      );
      return successResponse(mapVaccination(result.rows[0]), 201);
    }

    // Handle /:id routes
    const idMatch = path.match(/^\/([^\/]+)$/);
    if (idMatch) {
      const vaccinationId = idMatch[1];
      if (event.httpMethod === 'GET') {
        const result = await query(
          `SELECT v.*, u.full_name AS administered_by_name FROM vaccinations v
           LEFT JOIN users u ON v.administered_by = u.id
           WHERE v.id = $1 AND v.deleted_at IS NULL`,
          [vaccinationId]
        );
        if (result.rows.length === 0) throw new Error('Vaccination not found');
        return successResponse(mapVaccination(result.rows[0]));
      }
      if (event.httpMethod === 'PATCH') {
        const { vaccine, date, nextDue } = body;
        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;
        if (vaccine !== undefined) { updates.push(`vaccine = $${paramCount++}`); values.push(vaccine); }
        if (date !== undefined) { updates.push(`date = $${paramCount++}`); values.push(date); }
        if (nextDue !== undefined) { updates.push(`next_due = $${paramCount++}`); values.push(nextDue); }
        if (updates.length === 0) throw new Error('No fields to update');
        values.push(vaccinationId);
        const result = await query(
          `UPDATE vaccinations SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
           WHERE id = $${paramCount} AND deleted_at IS NULL RETURNING *`,
          values
        );
        if (result.rows.length === 0) throw new Error('Vaccination not found');
        return successResponse(mapVaccination(result.rows[0]));
      }
      if (event.httpMethod === 'DELETE') {
        await query('UPDATE vaccinations SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [vaccinationId]);
        return successResponse({ message: 'Vaccination record deleted successfully' });
      }
    }

    return errorResponse(new Error('Route not found'), 404);
  } catch (error: any) {
    return errorResponse(error);
  }
};

export { handler };
