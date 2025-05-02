import { Pool } from 'pg';
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { env } from './env';
import * as schema from '../shared/schema';
import { logger } from './logger';
import ws from "ws";

neonConfig.webSocketConstructor = ws;
neonConfig.fetchConnectionCache = true;

// Get database connection string
const connectionString = env.DATABASE_URL;

// Setup connection pool for traditional pg client with retry logic
const createPool = () => {
  const newPool = new Pool({
    connectionString,
    max: 10, // Maximum number of clients
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection not established
  });

  newPool.on('connect', () => {
    logger.info('Connected to PostgreSQL database');
  });

  newPool.on('error', (err) => {
    logger.error('PostgreSQL connection error', { 
      error: err.message, 
      code: err.code,
      detail: err.detail || 'No details provided' 
    });

    // For connection termination errors, we'll create a new pool next time
    if (err.code === '57P01') {
      logger.warn('Connection terminated by administrator, will reconnect on next request');
      newPool.end().catch(endErr => {
        logger.error('Error ending pool after connection error', { error: endErr.message });
      });
    }
  });

  return newPool;
};

// Create initial pool
export let pool = createPool();

// For serverless environments (Replit deployment)
// Create a function to get an HTTP-based connection with retries
const createNeonClient = () => {
  try {
    return neon(connectionString);
  } catch (error) {
    logger.error('Failed to create Neon client', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    // Return a fallback function that will retry on next call
    return (...args) => {
      logger.info('Retrying Neon connection...');
      const client = neon(connectionString);
      return client(...args);
    };
  }
};

// Initialize the SQL client
const sql = createNeonClient();

// Create Drizzle ORM instance
export const db = drizzle(sql, { schema });

// Helper to reconnect to database
export const reconnectDatabase = async () => {
  try {
    // Close existing pool if it exists
    if (pool) {
      await pool.end();
    }
    // Create a new pool
    pool = createPool();
    logger.info('Successfully reconnected to database');
    return true;
  } catch (error) {
    logger.error('Failed to reconnect to database', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return false;
  }
};