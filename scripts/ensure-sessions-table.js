#!/usr/bin/env node
/**
 * This script ensures that the sessions table exists in the PostgreSQL database
 * It's designed to be run during deployment to ensure the session store is ready
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

// Create a new PostgreSQL client
const client = new pg.Client({
  connectionString: DATABASE_URL
});

async function createSessionsTable() {
  try {
    // Connect to the database
    await client.connect();
    console.log('Connected to PostgreSQL database');

    // Check if the sessions table exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'sessions'
      );
    `;
    
    const tableExists = await client.query(checkTableQuery);
    
    if (tableExists.rows[0].exists) {
      console.log('Sessions table already exists');
    } else {
      // Create the sessions table if it doesn't exist
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS "sessions" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL,
          CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
        );
        CREATE INDEX IF NOT EXISTS "IDX_sessions_expire" ON "sessions" ("expire");
      `;
      
      await client.query(createTableQuery);
      console.log('Sessions table created successfully');
    }
  } catch (error) {
    console.error('Error creating sessions table:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await client.end();
    console.log('PostgreSQL connection closed');
  }
}

// Run the function
createSessionsTable();