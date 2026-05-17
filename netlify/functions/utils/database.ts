/**
 * =============================================================================
 * DATABASE UTILITIES - CONNECTION POOL MANAGEMENT
 * =============================================================================
 *
 * BEGINNER EXPLANATION:
 * This file manages database connections for our serverless functions.
 * It creates a "connection pool" - a group of reusable database connections
 * that multiple API requests can share.
 *
 * WHY A POOL INSTEAD OF NEW CONNECTIONS?
 * - Creating new database connections is slow (takes ~100-500ms)
 * - Serverless functions are short-lived (10-second timeout)
 * - Pool reuses connections across requests, making queries faster
 *
 * WHY SINGLETON POOL?
 * - Each serverless function instance gets one pool
 * - Prevents multiple pools fighting for the same connections
 * - Ensures efficient resource usage
 *
 * CONFIGURATION CHOICES:
 * - max: 5 connections (Neon free tier limits concurrent connections)
 * - idleTimeoutMillis: 30000ms (close unused connections after 30 seconds)
 * - connectionTimeoutMillis: 10000ms (fail fast on connection issues)
 *
 * =============================================================================
 */

import pg from 'pg';

const { Pool } = pg;

// Singleton pool instance - one per function instance
let pool: pg.Pool | null = null;

/**
 * getPool - Returns the shared database connection pool
 *
 * WHY SINGLETON PATTERN?
 * Serverless functions can be invoked multiple times rapidly.
 * Without singleton, each invocation would create a new pool,
 * leading to connection exhaustion and performance issues.
 *
 * @returns pg.Pool - The shared connection pool instance
 */
export const getPool = () => {
  if (!pool) {
    console.log('Initializing database connection pool...');

    // Support both DATABASE_URL (production) and individual vars (development)
    const poolConfig = process.env.DATABASE_URL
      ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false, // Required for Neon SSL connections
        },
      }
      : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'petcare_db',
        user: process.env.DB_USER || 'postgres',
        password: String(process.env.DB_PASSWORD || ''),
      };

    console.log('Database config:', {
      hasConnectionString: !!process.env.DATABASE_URL,
      host: poolConfig.connectionString ? 'Using connection string' : poolConfig.host,
      database: poolConfig.connectionString ? 'Using connection string' : poolConfig.database,
    });

    pool = new Pool({
      ...poolConfig,
      max: 5, // WHY 5? Neon free tier allows max 5 concurrent connections
      idleTimeoutMillis: 30000, // Close unused connections after 30 seconds to prevent leaks
      connectionTimeoutMillis: 10000, // Fail fast (10s) instead of hanging - important for serverless 10s timeout
    });

    // Add error handler for pool
    pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });
  }

  return pool;
};

/**
 * query - Execute a database query with automatic error handling
 *
 * WHY THIS HELPER FUNCTION?
 * - Consistent error logging across all database operations
 * - Automatic pool management (no need to manually get pool)
 * - Centralized error handling for debugging
 *
 * @param text - SQL query string
 * @param params - Query parameters (prevents SQL injection)
 * @returns pg.QueryResult - Database query result
 */
export const query = async (text: string, params?: any[]) => {
  const pool = getPool();
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};
