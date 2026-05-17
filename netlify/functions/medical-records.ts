/**
 * Medical Records Serverless Function
 * 
 * BEGINNER EXPLANATION:
 * This function manages general medical records for pets. These are high-level
 * records of medical events like checkups, surgeries, or emergencies.
 * 
 * API Endpoints:
 * GET    /medical-records          - List medical records (filtered by role)
 * GET    /medical-records?petId=x  - Get records for specific pet
 * POST   /medical-records          - Create new medical record
 * PATCH  /medical-records/:id      - Update existing record
 * DELETE /medical-records/:id      - Delete record (soft delete)
 * 
 * Medical Record Structure:
 * - date: When the medical event occurred
 * - recordType: Category (e.g., "Checkup", "Surgery", "Emergency")
 * - description: Detailed notes about the event
 * - diagnosis: Medical diagnosis (optional)
 * - treatment: Treatment provided (optional)
 * - veterinarianId: Which vet handled it
 * 
 * vs. Clinical Records:
 * Medical Records = Simplified general notes
 * Clinical Records = Detailed visit notes with symptoms, diagnosis, treatment, meds
 * 
 * Both exist to give flexibility:
 * - Quick entry: Use medical records
 * - Detailed documentation: Use clinical records
 * 
 * Role-Based Access:
 * - Pet Owners: See records for their pets only
 * - Veterinarians: See all records (need for medical context)
 * - Administrators: See all records
 * 
 * Data Mapping:
 * Database uses snake_case (record_type)
 * Frontend expects camelCase (recordType)
 * Helper function mapRecord() converts between formats
 * 
 * Why? Different conventions:
 * - SQL: snake_case is standard
 * - JavaScript: camelCase is standard
 */

import { Handler, HandlerEvent } from '@netlify/functions';
import { query } from './utils/database';
import { requireAuth } from './utils/auth';
import { successResponse, errorResponse, corsResponse } from './utils/response';

/**
 * Map Database Row to Frontend Format
 * 
 * BEGINNER EXPLANATION:
 * Converts field names from database format (snake_case) to JavaScript
 * format (camelCase). This makes the API response match what the
 * frontend TypeScript interfaces expect.
 * 
 * Example:
 * DB: { pet_id: "123", record_type: "Checkup" }
 * Frontend: { petId: "123", recordType: "Checkup" }
 */
function mapRecord(row: any) {
  return {
    id: row.id,
    petId: row.pet_id,
    date: row.date,
    recordType: row.record_type,
    description: row.description,
    diagnosis: row.diagnosis,
    treatment: row.treatment,
    veterinarianId: row.veterinarian_id,
    veterinarianName: row.veterinarian_name || row.vet_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    petName: row.pet_name || undefined,
  };
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') return corsResponse();

  try {
    const path = event.path.replace('/.netlify/functions/medical-records', '').replace('/api/medical-records', '');
    const body = event.body ? JSON.parse(event.body) : {};
    const params = event.queryStringParameters || {};
    const user = await requireAuth(event);

    // GET /medical-records OR /medical-records?petId=xyz
    if (path === '' && event.httpMethod === 'GET') {
      let queryText = `SELECT mr.*, p.name as pet_name FROM medical_records mr
                       JOIN pets p ON mr.pet_id = p.id
                       WHERE mr.deleted_at IS NULL`;
      const values: any[] = [];
      let paramCount = 1;

      if (params.petId) {
        queryText += ` AND mr.pet_id = $${paramCount++}`;
        values.push(params.petId);
      }

      if (user.userType === 'pet_owner') {
        queryText += ` AND p.owner_id = $${paramCount++}`;
        values.push(user.id);
      }

      queryText += ' ORDER BY mr.date DESC';
      const result = await query(queryText, values);
      return successResponse(result.rows.map(mapRecord));
    }

    // GET /medical-records/pet/:petId (frontend expectation)
    const petMatch = path.match(/^\/pet\/([^\/]+)$/);
    if (petMatch && event.httpMethod === 'GET') {
      const petId = petMatch[1];
      let queryText = `SELECT mr.*, p.name as pet_name FROM medical_records mr
                       JOIN pets p ON mr.pet_id = p.id
                       WHERE mr.pet_id = $1 AND mr.deleted_at IS NULL`;
      const values: any[] = [petId];
      if (user.userType === 'pet_owner') {
        queryText += ' AND p.owner_id = $2';
        values.push(user.id);
      }
      queryText += ' ORDER BY mr.date DESC';
      const result = await query(queryText, values);
      return successResponse(result.rows.map(mapRecord));
    }

    // POST /medical-records
    if (path === '' && event.httpMethod === 'POST') {
      const { petId, date, recordType, description, diagnosis, treatment, veterinarianId, veterinarianName } = body;
      if (!petId || !date || !recordType) {
        throw new Error('Missing required fields');
      }
      const result = await query(
        `INSERT INTO medical_records (pet_id, date, record_type, description, diagnosis, treatment, veterinarian_id, veterinarian_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [petId, date, recordType, description || null, diagnosis || null, treatment || null, veterinarianId || user.id, veterinarianName || user.fullName || null]
      );
      return successResponse(mapRecord(result.rows[0]), 201);
    }

    // Handle /:id and /:id/deactivate style routes
    const idMatch = path.match(/^\/([^\/]+)$/);
    if (idMatch) {
      const recordId = idMatch[1];

      if (event.httpMethod === 'GET') {
        const result = await query('SELECT * FROM medical_records WHERE id = $1 AND deleted_at IS NULL', [recordId]);
        if (result.rows.length === 0) throw new Error('Medical record not found');
        return successResponse(mapRecord(result.rows[0]));
      }

      if (event.httpMethod === 'PATCH') {
        const { date, recordType, description, diagnosis, treatment } = body;
        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;
        if (date !== undefined) { updates.push(`date = $${paramCount++}`); values.push(date); }
        if (recordType !== undefined) { updates.push(`record_type = $${paramCount++}`); values.push(recordType); }
        if (description !== undefined) { updates.push(`description = $${paramCount++}`); values.push(description); }
        if (diagnosis !== undefined) { updates.push(`diagnosis = $${paramCount++}`); values.push(diagnosis); }
        if (treatment !== undefined) { updates.push(`treatment = $${paramCount++}`); values.push(treatment); }
        if (updates.length === 0) throw new Error('No fields to update');
        values.push(recordId);
        const result = await query(
          `UPDATE medical_records SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
           WHERE id = $${paramCount} AND deleted_at IS NULL RETURNING *`,
          values
        );
        if (result.rows.length === 0) throw new Error('Medical record not found');
        return successResponse(mapRecord(result.rows[0]));
      }

      if (event.httpMethod === 'DELETE') {
        await query('UPDATE medical_records SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [recordId]);
        return successResponse({ message: 'Medical record deleted successfully' });
      }
    }

    return errorResponse(new Error('Route not found'), 404);
  } catch (error: any) {
    return errorResponse(error);
  }
};

export { handler };
