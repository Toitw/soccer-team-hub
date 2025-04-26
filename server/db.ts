import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';
import { sql } from 'drizzle-orm';

// Use environment variables for database connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Create postgres client
const client = postgres(connectionString, { max: 1 });

// Create drizzle instance
export const db = drizzle(client, { schema });

// Make sure DB is connected
export async function testDatabaseConnection() {
  try {
    // Try a simple query
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('Database connection is working!');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Helper for raw queries
export { sql } from 'drizzle-orm';