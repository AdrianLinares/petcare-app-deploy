/**
 * Authentication Utility Module
 * 
 * BEGINNER EXPLANATION:
 * This module provides helper functions for verifying user identity in API requests.
 * Think of it as a "security checkpoint" that other functions use to make sure
 * the person making a request is who they claim to be.
 * 
 * Key Functions:
 * 1. getUserFromToken(): Extracts and validates JWT token from request
 * 2. requireAuth(): Ensures request has valid authentication (throws if not)
 * 3. requireAdmin(): Ensures user is an administrator (throws if not)
 * 4. requireRole(): Ensures user has specific role (throws if not)
 * 
 * How JWT Verification Works:
 * 1. Extract token from Authorization header ("Bearer <token>")
 * 2. Verify token signature using JWT_SECRET
 * 3. Check token hasn't expired
 * 4. Look up user in database to ensure they still exist
 * 5. Return user object if all checks pass
 * 
 * Why Check Database After Token Verification?
 * Tokens can be valid but the user might have been:
 * - Deleted from the system
 * - Had their account disabled
 * - Had their role changed
 * So we always verify against the database.
 * 
 * Usage Pattern in Other Functions:
 * ```typescript
 * const user = await requireAuth(event);  // Get authenticated user or throw
 * // Now we know user is valid, can use user.id, user.userType, etc.
 * ```
 * 
 * Security Features:
 * - Validates token signature (prevents tampering)
 * - Checks expiration (prevents replay attacks)
 * - Verifies user still exists (handles deleted accounts)
 * - Role-based access control (different permissions per user type)
 */

import jwt from 'jsonwebtoken';
import { HandlerEvent } from '@netlify/functions';
import { query } from './database';

/**
 * Token Payload Interface
 * 
 * BEGINNER NOTE: This defines what data is stored INSIDE the JWT token.
 * The token is encrypted, but once decoded, it contains this information.
 */
export interface TokenPayload {
  userId: string;
  email: string;
  userType: string;
}

/**
 * User Interface
 * 
 * BEGINNER NOTE: This defines the user object returned after authentication.
 * It contains all user information except sensitive data (like password).
 */
export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  userType: string;
  accessLevel?: string;
  address?: string;
  specialization?: string;
  licenseNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get User From Token
 * 
 * BEGINNER EXPLANATION:
 * Extracts the JWT token from the request and returns the user it belongs to.
 * Returns null if token is missing, invalid, expired, or user doesn't exist.
 * 
 * This is the "gentle" version - it doesn't throw errors, just returns null.
 * Use this when authentication is optional.
 * 
 * @param {HandlerEvent} event - The incoming HTTP request
 * @returns {Promise<User | null>} The authenticated user or null
 */
export const getUserFromToken = async (event: HandlerEvent): Promise<User | null> => {
  try {
    const token = event.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default_secret'
    ) as TokenPayload;

    const result = await query(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // Map snake_case database fields to camelCase
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      phone: row.phone,
      userType: row.user_type,
      accessLevel: row.access_level,
      address: row.address,
      specialization: row.specialization,
      licenseNumber: row.license_number,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    return null;
  }
};

export const requireAuth = async (event: HandlerEvent): Promise<User> => {
  const user = await getUserFromToken(event);

  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
};

export const requireRole = async (event: HandlerEvent, ...allowedRoles: string[]): Promise<User> => {
  const user = await requireAuth(event);

  if (!allowedRoles.includes(user.userType)) {
    throw new Error('Insufficient permissions');
  }

  return user;
};

export const requireAdmin = async (
  event: HandlerEvent,
  minLevel?: 'standard' | 'elevated' | 'super_admin'
): Promise<User> => {
  const user = await requireAuth(event);

  if (user.userType !== 'administrator') {
    throw new Error('Administrator access required');
  }

  if (minLevel) {
    const levels = ['standard', 'elevated', 'super_admin'];
    const userLevel = levels.indexOf(user.accessLevel || 'standard');
    const requiredLevel = levels.indexOf(minLevel);

    if (userLevel < requiredLevel) {
      throw new Error('Insufficient admin privileges');
    }
  }

  return user;
};
