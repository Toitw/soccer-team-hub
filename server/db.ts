import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { env } from './env';
import { logger } from './logger';
import { sql } from 'drizzle-orm';

// Configure WebSocket for Neon PostgreSQL (necessary for production)
neonConfig.webSocketConstructor = ws;

if (!env.DATABASE_URL) {
  const errorMsg = 'Missing DATABASE_URL environment variable';
  logger.error(errorMsg);
  if (env.NODE_ENV === 'production') {
    // In production, this is a critical error that we need to know about
    console.error(`CRITICAL ERROR: ${errorMsg}`);
  } else {
    throw new Error(errorMsg);
  }
}

// Improved PostgreSQL connection configuration optimized for production
const poolConfig = {
  connectionString: env.DATABASE_URL,
  max: env.NODE_ENV === 'production' ? 20 : 10, // More clients for production
  idleTimeoutMillis: 30000, // How long a client can remain idle
  connectionTimeoutMillis: env.NODE_ENV === 'production' ? 10000 : 5000, // Longer timeout for production
  maxUses: 7500, // Prevent memory leaks by recycling connections
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined, // Force SSL in production
  statement_timeout: 30000, // Timeout for long-running queries (30 seconds)
};

logger.info(`Initializing database connection in ${env.NODE_ENV} mode`);

// Create the connection pool
export const pool = new Pool(poolConfig);

// Enhanced connection error handler 
pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { 
    error: err.message, 
    stack: err.stack,
    environment: env.NODE_ENV,
    time: new Date().toISOString()
  });
  
  // In production, don't crash the server but log the error
  if (env.NODE_ENV !== 'production') {
    console.error('Database connection error in development - exiting for visibility');
    process.exit(1); // Only exit in development to make issues obvious
  }
});

// Retry mechanism for database operations in production
export async function executeWithRetry<T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) throw error;
    
    logger.warn(`Database operation failed, retrying... (${retries} attempts left)`, { 
      error: (error as Error).message 
    });
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Exponential backoff
    return executeWithRetry(operation, retries - 1, delay * 2);
  }
}

// Health check function with retry for production
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // In production, use executeWithRetry for reliable health checks
    if (env.NODE_ENV === 'production') {
      await executeWithRetry(async () => {
        const client = await pool.connect();
        try {
          await client.query('SELECT 1');
        } finally {
          client.release();
        }
      });
    } else {
      // Simpler approach for development
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }
    }
    return true;
  } catch (error) {
    logger.error('Database connection check failed', { 
      error: (error as Error).message,
      stack: (error as Error).stack,
      environment: env.NODE_ENV,
    });
    return false;
  }
}

// Create drizzle ORM instance
export const db = drizzle({ client: pool, schema });

// Create a query function that automatically uses retries in production
export async function executeQuery<T>(queryFn: () => Promise<T>): Promise<T> {
  if (env.NODE_ENV === 'production') {
    return executeWithRetry(queryFn);
  }
  return queryFn();
}

// For production, immediately verify the database connection
if (env.NODE_ENV === 'production') {
  checkDatabaseConnection()
    .then(isConnected => {
      if (isConnected) {
        logger.info('Successfully connected to the database');
        // Perform a simple query to verify schema access
        return db.execute(sql`SELECT current_database()`).then(result => {
          logger.info('Database schema verification successful', { database: result[0]?.current_database });
        }).catch(error => {
          logger.error('Database schema verification failed', { error: error.message });
        });
      } else {
        logger.error('Failed to connect to the database');
      }
    })
    .catch(error => {
      logger.error('Error checking database connection', { error: error.message });
    });
}
