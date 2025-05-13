/**
 * Script to push Drizzle schema changes to the database
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '../shared/schema';
import * as dotenv from 'dotenv';

dotenv.config();

const migrationDir = './drizzle';

// Get the DATABASE_URL from environment variables
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Database URL not found. Make sure DATABASE_URL is set in your environment variables.');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(sql);

async function main() {
  console.log('Starting database schema push...');
  
  try {
    console.log('Applying schema changes...');
    // Push schema changes to the database
    await migrate(db, { migrationsFolder: migrationDir });
    
    console.log('Schema push completed successfully!');
  } catch (error) {
    console.error('Error pushing schema changes:', error);
  } finally {
    await sql.end();
  }
}

main().catch(console.error);