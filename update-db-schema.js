import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL);
const db = drizzle(sql_client);

async function runMigration() {
  console.log('Creating seasons table...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS seasons (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      team_id INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      description TEXT,
      start_date TIMESTAMP WITH TIME ZONE NOT NULL,
      end_date TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT TRUE
    );
  `);

  console.log('Adding season_id column to league_classification table...');
  try {
    await db.execute(sql`
      ALTER TABLE league_classification
      ADD COLUMN IF NOT EXISTS season_id INTEGER
    `);
  } catch (error) {
    console.error('Error adding season_id column:', error);
  }

  console.log('Database schema updated successfully');
}

runMigration()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });