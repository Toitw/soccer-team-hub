import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { env } from './bootstrap-env';

// Configure WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

// Improve connection pooling and timeout settings for production
export const pool = new Pool({ 
  connectionString: env.DATABASE_URL,
  idleTimeoutMillis: 10000, // Reduce idle timeout to handle connection limitations
  max: 20, // Maximum number of clients in the pool
  connectionTimeoutMillis: 5000 // Connection timeout
});

// Create drizzle instance with the pool
export const db = drizzle({ client: pool, schema });

// Setup health check function
export async function performHealthCheck() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}