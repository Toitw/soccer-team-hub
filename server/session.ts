import session, { SessionOptions } from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db';
import { env } from './bootstrap-env';

// Create PostgreSQL session store
const PgSession = connectPgSimple(session);

// Initialize the session store with our pool
export const sessionStore = new PgSession({
  pool,
  tableName: 'session', // Default table name
  createTableIfMissing: true, // Automatically create the table if it doesn't exist
  pruneSessionInterval: 60 * 15, // Clean expired sessions every 15 minutes
});

// Configure session options
export const sessionSettings: SessionOptions = {
  store: sessionStore,
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    secure: env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true,
    sameSite: 'lax',
  },
  name: 'app.sid', // Custom cookie name
};

// Function to create the sessions table if it doesn't exist
export async function ensureSessionTableExists() {
  try {
    // Check if the table exists
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'session'
      );
    `);
    
    if (!result.rows[0].exists) {
      console.log('Creating session table...');
      
      // Use the createTableIfMissing option or manually create the table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "session" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL,
          CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
        );
        CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
      `);
      
      console.log('Session table created successfully');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to ensure session table exists:', error);
    return false;
  }
}