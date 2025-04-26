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

// For production, immediately verify the database connection
if (env.NODE_ENV === 'production') {
  checkDatabaseConnection()
    .then(isConnected => {
      if (isConnected) {
        logger.info('Successfully connected to the database');
      } else {
        logger.error('Failed to connect to the database');
      }
    })
    .catch(error => {
      logger.error('Error checking database connection', { error: error.message });
    });
}
