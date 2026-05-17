/**
 * Pets Serverless Function
 * 
 * BEGINNER EXPLANATION:
 * This function manages pet records in the system. It handles creating new pets,
 * viewing pet information, updating pet details, and soft-deleting pets.
 * 
 * API Endpoints:
 * GET    /pets        - Get all pets (filtered by user role)
 * POST   /pets        - Create new pet
 * GET    /pets/:id    - Get specific pet details
 * PATCH  /pets/:id    - Update pet information
 * DELETE /pets/:id    - Delete pet (soft delete)
 * 
 * Role-Based Filtering:
 * - Pet Owners: See only THEIR pets
 * - Veterinarians: See ALL pets (need access for medical records)
 * - Administrators: See ALL pets (system management)
 * 
 * Soft Delete Pattern:
 * We don't actually delete pet records from the database. Instead, we set
 * a 'deleted_at' timestamp. This allows:
 * - Preserving medical history even if pet is removed
 * - Potential recovery if deleted by accident
 * - Audit trail of what happened and when
 * 
 * Pet Data Structure:
 * Basic Info:
 * - name, species, breed, age, gender, color
 * - microchip_id, weight
 * 
 * Medical Info:
 * - medical_history: Array of past medical events
 * - allergies: Array of known allergies
 * - current_medications: Array of active medications
 * - notes: General notes about the pet
 * 
 * Owner Association:
 * - owner_id: Links pet to user
 * - owner_name, owner_email: Populated via SQL JOIN
 * 
 * Authentication:
 * All endpoints require valid JWT token. User type determines access level.
 * 
 * Example Flow (Create Pet):
 * 1. Client sends POST /pets with pet data
 * 2. Server verifies JWT token
 * 3. If pet owner: use their user ID as owner
 * 4. If admin/vet: can specify different owner ID
 * 5. Insert into database
 * 6. Return created pet object
 */

import { Handler, HandlerEvent } from '@netlify/functions';
import { query } from './utils/database';
import { requireAuth, requireRole } from './utils/auth';
import { successResponse, errorResponse, corsResponse } from './utils/response';

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  try {
    const path = event.path.replace('/.netlify/functions/pets', '').replace('/api/pets', '');
    let body = {};

    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch (parseError: any) {
      console.error('Error parsing request body:', parseError.message);
      console.error('Raw body:', event.body);
      return errorResponse(new Error('Invalid JSON in request body'), 400);
    }

    console.log('Request:', { method: event.httpMethod, path, body });

    const user = await requireAuth(event);

    // GET /pets - Get all pets for current user or all if vet/admin
    if (path === '' && event.httpMethod === 'GET') {
      let queryText = `SELECT p.*, u.full_name as owner_name, u.email as owner_email 
                       FROM pets p 
                       JOIN users u ON p.owner_id = u.id 
                       WHERE p.deleted_at IS NULL`;
      const values: any[] = [];

      if (user.userType === 'pet_owner') {
        queryText += ' AND p.owner_id = $1';
        values.push(user.id);
      }

      queryText += ' ORDER BY p.created_at DESC';

      const result = await query(queryText, values);
      return successResponse(result.rows.map((pet: any) => ({
        id: pet.id,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        age: pet.age,
        gender: pet.gender,
        color: pet.color,
        microchipId: pet.microchip_id,
        weight: pet.weight,
        ownerId: pet.owner_id,
        ownerName: pet.owner_name,
        ownerEmail: pet.owner_email,
        medicalHistory: pet.medical_history,
        allergies: pet.allergies,
        conditions: pet.conditions,
        currentMedications: pet.current_medications,
        notes: pet.notes,
        createdAt: pet.created_at,
        updatedAt: pet.updated_at,
      })));
    }

    // POST /pets - Create new pet
    if (path === '' && event.httpMethod === 'POST') {
      const { name, species, breed, age, gender, color, microchipId, weight, ownerId } = body;

      console.log('POST /pets - Received:', { name, species, breed, age, gender, color, microchipId, weight, ownerId });

      if (!name || !species) {
        throw new Error('Name and species are required');
      }

      const ownerIdToUse = user.userType === 'pet_owner' ? user.id : ownerId;

      if (!ownerIdToUse) {
        throw new Error('Owner ID is required');
      }

      console.log('Inserting pet with ownerIdToUse:', ownerIdToUse);

      const result = await query(
        `INSERT INTO pets (name, species, breed, age, gender, color, microchip_id, weight, owner_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [name, species, breed || null, age || null, gender || null, color || null, microchipId || null, weight || null, ownerIdToUse]
      );

      console.log('Query result:', result);

      if (!result.rows || result.rows.length === 0) {
        throw new Error('Failed to create pet - no rows returned');
      }

      const pet = result.rows[0];
      console.log('Created pet:', pet);

      return successResponse({
        id: pet.id,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        age: pet.age,
        gender: pet.gender,
        color: pet.color,
        microchipId: pet.microchip_id,
        weight: pet.weight,
        ownerId: pet.owner_id,
        createdAt: pet.created_at,
      }, 201);
    }

    // Handle /:id routes
    const idMatch = path.match(/^\/([^\/]+)$/);
    if (idMatch) {
      const petId = idMatch[1];

      // GET /pets/:id
      if (event.httpMethod === 'GET') {
        let queryText = 'SELECT p.*, u.full_name as owner_name FROM pets p JOIN users u ON p.owner_id = u.id WHERE p.id = $1 AND p.deleted_at IS NULL';
        const values = [petId];

        if (user.userType === 'pet_owner') {
          queryText += ' AND p.owner_id = $2';
          values.push(user.id);
        }

        const result = await query(queryText, values);

        if (result.rows.length === 0) {
          throw new Error('Pet not found');
        }

        const pet = result.rows[0];
        return successResponse({
          id: pet.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          age: pet.age,
          gender: pet.gender,
          color: pet.color,
          microchipId: pet.microchip_id,
          weight: pet.weight,
          ownerId: pet.owner_id,
          ownerName: pet.owner_name,
          medicalHistory: pet.medical_history,
          allergies: pet.allergies,
          conditions: pet.conditions,
          currentMedications: pet.current_medications,
          notes: pet.notes,
          createdAt: pet.created_at,
          updatedAt: pet.updated_at,
        });
      }

      // PATCH /pets/:id
      if (event.httpMethod === 'PATCH') {
        const { name, species, breed, age, gender, color, microchipId, weight, conditions, medicalHistory, allergies, currentMedications, notes } = body;

        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (name !== undefined) {
          updates.push(`name = $${paramCount++}`);
          values.push(name);
        }
        if (species !== undefined) {
          updates.push(`species = $${paramCount++}`);
          values.push(species);
        }
        if (breed !== undefined) {
          updates.push(`breed = $${paramCount++}`);
          values.push(breed);
        }
        if (age !== undefined) {
          updates.push(`age = $${paramCount++}`);
          values.push(age);
        }
        if (gender !== undefined) {
          updates.push(`gender = $${paramCount++}`);
          values.push(gender);
        }
        if (color !== undefined) {
          updates.push(`color = $${paramCount++}`);
          values.push(color);
        }
        if (microchipId !== undefined) {
          updates.push(`microchip_id = $${paramCount++}`);
          values.push(microchipId);
        }
        if (weight !== undefined) {
          updates.push(`weight = $${paramCount++}`);
          values.push(weight);
        }
        if (medicalHistory !== undefined) {
          updates.push(`medical_history = $${paramCount++}`);
          values.push(medicalHistory);
        }
        if (conditions !== undefined) {
          updates.push(`conditions = $${paramCount++}`);
          values.push(conditions);
        }
        if (allergies !== undefined) {
          updates.push(`allergies = $${paramCount++}`);
          values.push(allergies);
        }
        if (currentMedications !== undefined) {
          updates.push(`current_medications = $${paramCount++}`);
          values.push(currentMedications);
        }
        if (notes !== undefined) {
          updates.push(`notes = $${paramCount++}`);
          values.push(notes);
        }

        if (updates.length === 0) {
          throw new Error('No fields to update');
        }

        values.push(petId);
        let whereClause = `id = $${paramCount}`;

        if (user.userType === 'pet_owner') {
          whereClause += ` AND owner_id = $${paramCount + 1}`;
          values.push(user.id);
        }

        const result = await query(
          `UPDATE pets SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
           WHERE ${whereClause} AND deleted_at IS NULL
           RETURNING *`,
          values
        );

        if (result.rows.length === 0) {
          throw new Error('Pet not found or access denied');
        }

        const pet = result.rows[0];
        return successResponse({
          id: pet.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          age: pet.age,
          gender: pet.gender,
          color: pet.color,
          microchipId: pet.microchip_id,
          weight: pet.weight,
          ownerId: pet.owner_id,
          medicalHistory: pet.medical_history,
          allergies: pet.allergies,
          conditions: pet.conditions,
          currentMedications: pet.current_medications,
          notes: pet.notes,
          updatedAt: pet.updated_at,
        });
      }

      // DELETE /pets/:id
      if (event.httpMethod === 'DELETE') {
        let queryText = 'UPDATE pets SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1';
        const values = [petId];

        if (user.userType === 'pet_owner') {
          queryText += ' AND owner_id = $2';
          values.push(user.id);
        }

        const result = await query(queryText, values);

        if (result.rowCount === 0) {
          throw new Error('Pet not found or access denied');
        }

        return successResponse({ message: 'Pet deleted successfully' });
      }
    }

    return errorResponse(new Error('Route not found'), 404);
  } catch (error: any) {
    return errorResponse(error);
  }
};

export { handler };
