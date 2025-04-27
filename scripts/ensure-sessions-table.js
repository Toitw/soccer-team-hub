/**
 * Script to ensure the database is properly set up for production
 * 
 * This script checks that the database is accessible and properly configured
 * for production use, including the required tables for session management.
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Check if DATABASE_URL environment variable exists
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not defined in the environment variables');
  process.exit(1);
}

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Log directory for recording errors
const LOG_DIR = path.join(__dirname, '..', 'logs');
const DB_LOG_FILE = path.join(LOG_DIR, 'db-setup.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

async function logMessage(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
  
  console.log(formattedMessage.trim());
  
  try {
    fs.appendFileSync(DB_LOG_FILE, formattedMessage);
  } catch (error) {
    console.error('Failed to write to log file:', error.message);
  }
}

async function checkDatabaseConnection() {
  try {
    await logMessage('Checking database connection...');
    const result = await pool.query('SELECT NOW()');
    await logMessage(`Database connection successful! Server time: ${result.rows[0].now}`);
    return true;
  } catch (error) {
    await logMessage(`Database connection failed: ${error.message}`, 'error');
    return false;
  }
}

async function checkSessionsTable() {
  try {
    await logMessage('Checking if sessions table exists...');
    
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'sessions'
      );
    `);
    
    return result.rows[0].exists;
  } catch (error) {
    await logMessage(`Failed to check sessions table: ${error.message}`, 'error');
    return false;
  }
}

async function createSessionsTable() {
  try {
    await logMessage('Creating sessions table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_sessions_expire" ON "sessions" ("expire");
    `);
    
    await logMessage('Sessions table created successfully!');
    return true;
  } catch (error) {
    await logMessage(`Failed to create sessions table: ${error.message}`, 'error');
    return false;
  }
}

async function checkAndPrepareDatabase() {
  try {
    // Step 1: Check database connection
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      await logMessage('Database connection check failed. Cannot proceed.', 'error');
      return false;
    }
    
    // Step 2: Check if sessions table exists
    const sessionTableExists = await checkSessionsTable();
    if (sessionTableExists) {
      await logMessage('Sessions table already exists. No action needed.');
    } else {
      // Step 3: Create sessions table if it doesn't exist
      const created = await createSessionsTable();
      if (!created) {
        await logMessage('Failed to create sessions table. Session persistence may not work in production.', 'error');
      }
    }
    
    // Step 4: Final verification
    const verifyTable = await checkSessionsTable();
    if (verifyTable) {
      await logMessage('Database setup complete! Sessions table is ready for production use.');
      return true;
    } else {
      await logMessage('Database setup incomplete. Sessions table verification failed.', 'error');
      return false;
    }
  } catch (error) {
    await logMessage(`An unexpected error occurred: ${error.message}`, 'error');
    console.error(error);
    return false;
  } finally {
    // Close the database pool
    await pool.end();
  }
}

// Run the function
checkAndPrepareDatabase()
  .then(success => {
    if (success) {
      console.log('Database preparation complete! Ready for production deployment.');
      process.exit(0);
    } else {
      console.log('Database preparation failed. Check logs for details.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Fatal error during database preparation:', error);
    process.exit(1);
  });