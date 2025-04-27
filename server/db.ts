import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { env } from './env';
import { logger } from './logger';

neonConfig.webSocketConstructor = ws;

// Configure PostgreSQL connection with better production settings
const poolConfig = {
  connectionString: env.DATABASE_URL,
  max: env.NODE_ENV === 'production' ? 20 : 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // How long to wait before timing out when connecting a new client
  maxUses: 7500, // Close and replace a connection after it has been used this many times (prevents memory leaks)
};

logger.info(`Initializing database connection in ${env.NODE_ENV} mode`);

// Create the connection pool
export const pool = new Pool(poolConfig);

// Setup connection error handler for better diagnostics
pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err.message, stack: err.stack });
  
  // In production, don't crash the server but log the error
  if (env.NODE_ENV !== 'production') {
    process.exit(1); // Only exit in development to make issues obvious
  }
});

// Health check function to verify database connectivity
export async function checkDatabaseConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return true;
  } catch (error) {
    logger.error('Database connection check failed', { error: (error as Error).message });
    return false;
  } finally {
    client.release();
  }
}

// Create drizzle ORM instance
export const db = drizzle({ client: pool, schema });

// Retry connection with exponential backoff
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Retry function for database connection
export async function tryConnectWithRetry(retryCount = 0, delay = INITIAL_RETRY_DELAY): Promise<boolean> {
  try {
    const isConnected = await checkDatabaseConnection();
    
    if (isConnected) {
      logger.info('Successfully connected to the database');
      return true;
    } else if (retryCount < MAX_RETRIES) {
      const nextDelay = delay * 2; // Exponential backoff
      const nextRetryCount = retryCount + 1;
      
      logger.warn(`Database connection attempt failed, retrying in ${delay}ms (attempt ${nextRetryCount}/${MAX_RETRIES})`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      return tryConnectWithRetry(nextRetryCount, nextDelay);
    } else {
      logger.error(`Failed to connect to database after ${MAX_RETRIES} attempts`);
      return false;
    }
  } catch (error) {
    logger.error('Error during database connection retry', { 
      error: (error as Error).message,
      retryCount,
      maxRetries: MAX_RETRIES 
    });
    
    if (retryCount < MAX_RETRIES) {
      const nextDelay = delay * 2;
      const nextRetryCount = retryCount + 1;
      
      logger.warn(`Database connection error, retrying in ${delay}ms (attempt ${nextRetryCount}/${MAX_RETRIES})`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      return tryConnectWithRetry(nextRetryCount, nextDelay);
    }
    
    return false;
  }
}

// Connection retry mechanism for production environments
if (env.NODE_ENV === 'production') {
  // Start the connection retry process
  tryConnectWithRetry().then(success => {
    if (!success) {
      logger.warn('Server will continue running despite database connection issues');
    }
  });
}
