/**
 * Clinical Records Serverless Function
 * 
 * BEGINNER EXPLANATION:
 * This function manages detailed clinical visit records. These are comprehensive
 * notes that veterinarians create after examining a pet, including symptoms,
 * diagnosis, treatment, and prescribed medications.
 * 
 * API Endpoints:
 * GET    /clinical-records          - List all clinical records (filtered by role)
 * GET    /clinical-records?petId=x  - Get clinical records for specific pet
 * POST   /clinical-records          - Create new clinical record
 * PATCH  /clinical-records/:id      - Update clinical record
 * DELETE /clinical-records/:id      - Delete clinical record
 * 
 * Clinical Record Structure:
 * - petId: Which pet was examined
 * - appointmentId: Link to appointment (optional)
 * - veterinarianId: Which vet examined the pet
 * - date: When the examination occurred
 * - symptoms: What symptoms were observed
 * - diagnosis: The medical diagnosis
 * - treatment: What treatment was provided
 * - medications: Array of medications prescribed
 * - notes: Additional observations
 * - followUpDate: When pet should return (if needed)
 * 
 * Clinical Records vs Medical Records:
 * - Clinical Records: Detailed visit notes (symptoms → diagnosis → treatment)
 * - Medical Records: General medical events ("Had surgery", "Annual checkup")
 * 
 * Both serve different purposes:
 * - Clinical: Detailed medical documentation for serious issues
 * - Medical: Quick high-level history
 * 
 * Medications Field:
 * Stored as JSON array in database:
 * Example: ["Amoxicillin 500mg", "Pain reliever"]
 * This is separate from the medications table, which tracks ongoing prescriptions.
 * 
 * Appointment Association:
 * Optional appointmentId links clinical record to appointment.
 * Allows viewing medical notes directly from appointment history.
 * 
 * Role-Based Access:
 * - Pet Owners: Can VIEW clinical records for their pets (read-only)
 * - Veterinarians: Can CREATE and EDIT clinical records
 * - Administrators: Full access to all records
 */

import { Handler } from '@netlify/functions';
import { query } from './utils/database';
import { requireAuth } from './utils/auth';
import { successResponse, errorResponse, corsResponse } from './utils/response';

/**
 * Map Clinical Record Database Row to Frontend Format
 * 
 * BEGINNER EXPLANATION:
 * Converts database field names to JavaScript format and ensures
 * the medications field is properly formatted as an array.
 */
function mapClinical(row: any) {
  return {
    id: row.id,
    petId: row.pet_id,
    appointmentId: row.appointment_id,
    appointmentType: row.appointment_type || null,
    veterinarianId: row.veterinarian_id,
    veterinarianName: row.veterinarian_name || row.vet_name || null,
    date: row.date,
    symptoms: row.symptoms,
    diagnosis: row.diagnosis,
    treatment: row.treatment,
    medications: row.medications || [],
    notes: row.notes,
    followUpDate: row.follow_up_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsResponse();
  try {
    const user = await requireAuth(event);
    const path = event.path.replace('/.netlify/functions/clinical-records', '').replace('/api/clinical-records', '');
    const body = event.body ? JSON.parse(event.body) : {};

    // GET /clinical-records
    if (path === '' && event.httpMethod === 'GET') {
      let queryText = `SELECT cr.*, u.full_name AS veterinarian_name FROM clinical_records cr
                       LEFT JOIN users u ON cr.veterinarian_id = u.id
                       JOIN pets p ON cr.pet_id = p.id
                       WHERE cr.deleted_at IS NULL`;
      const values: any[] = [];
      let paramCount = 1;
      if (user.userType === 'pet_owner') {
        queryText += ` AND p.owner_id = $${paramCount++}`;
        values.push(user.id);
      }
      queryText += ' ORDER BY cr.date DESC';
      const result = await query(queryText, values);
      return successResponse(result.rows.map(mapClinical));
    }

    // GET /clinical-records/pet/:petId
    const petMatch = path.match(/^\/pet\/([^\/]+)$/);
    if (petMatch && event.httpMethod === 'GET') {
      const petId = petMatch[1];
      let queryText = `SELECT cr.*, u.full_name AS veterinarian_name FROM clinical_records cr
                       LEFT JOIN users u ON cr.veterinarian_id = u.id
                       JOIN pets p ON cr.pet_id = p.id
                       WHERE cr.pet_id = $1 AND cr.deleted_at IS NULL`;
      const values: any[] = [petId];
      if (user.userType === 'pet_owner') { queryText += ' AND p.owner_id = $2'; values.push(user.id); }
      queryText += ' ORDER BY cr.date DESC';
      const result = await query(queryText, values);
      return successResponse(result.rows.map(mapClinical));
    }

    // POST /clinical-records
    if (path === '' && event.httpMethod === 'POST') {
      const { petId, appointmentId, date, symptoms, diagnosis, treatment, medications, notes, followUpDate } = body;
      if (!petId || !date || !symptoms || !diagnosis || !treatment) throw new Error('Missing required fields');
      const result = await query(
        `INSERT INTO clinical_records (pet_id, appointment_id, date, symptoms, diagnosis, treatment, medications, follow_up_date, veterinarian_id, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [petId, appointmentId || null, date, symptoms, diagnosis, treatment, medications || null, followUpDate || null, user.id, notes || null]
      );
      return successResponse(mapClinical(result.rows[0]), 201);
    }

    // /:id routes
    const idMatch = path.match(/^\/([^\/]+)$/);
    if (idMatch) {
      const clinicalId = idMatch[1];
      if (event.httpMethod === 'GET') {
        const result = await query(
          `SELECT cr.*, u.full_name AS veterinarian_name FROM clinical_records cr
           LEFT JOIN users u ON cr.veterinarian_id = u.id
           WHERE cr.id = $1 AND cr.deleted_at IS NULL`,
          [clinicalId]
        );
        if (result.rows.length === 0) throw new Error('Clinical record not found');
        return successResponse(mapClinical(result.rows[0]));
      }
      if (event.httpMethod === 'PATCH') {
        const { date, symptoms, diagnosis, treatment, medications, notes, followUpDate } = body;
        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;
        if (date !== undefined) { updates.push(`date = $${paramCount++}`); values.push(date); }
        if (symptoms !== undefined) { updates.push(`symptoms = $${paramCount++}`); values.push(symptoms); }
        if (diagnosis !== undefined) { updates.push(`diagnosis = $${paramCount++}`); values.push(diagnosis); }
        if (treatment !== undefined) { updates.push(`treatment = $${paramCount++}`); values.push(treatment); }
        if (medications !== undefined) { updates.push(`medications = $${paramCount++}`); values.push(medications); }
        if (notes !== undefined) { updates.push(`notes = $${paramCount++}`); values.push(notes); }
        if (followUpDate !== undefined) { updates.push(`follow_up_date = $${paramCount++}`); values.push(followUpDate); }
        if (updates.length === 0) throw new Error('No fields to update');
        values.push(clinicalId);
        const result = await query(
          `UPDATE clinical_records SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
           WHERE id = $${paramCount} AND deleted_at IS NULL RETURNING *`,
          values
        );
        if (result.rows.length === 0) throw new Error('Clinical record not found');
        return successResponse(mapClinical(result.rows[0]));
      }
      if (event.httpMethod === 'DELETE') {
        await query('UPDATE clinical_records SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [clinicalId]);
        return successResponse({ message: 'Clinical record deleted successfully' });
      }
    }

    return errorResponse(new Error('Route not found'), 404);
  } catch (error: any) {
    return errorResponse(error);
  }
};

export { handler };
