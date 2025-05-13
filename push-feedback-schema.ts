/**
 * Script to push feedback schema changes to database
 * This creates the necessary feedback table in the database with the correct column structure
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import { feedback } from "./shared/schema";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable not set");
  process.exit(1);
}

// Initialize the SQL client
const sql = neon(process.env.DATABASE_URL!);
// Initialize drizzle with the client
const db = drizzle(sql);

async function recreateFeedbackTable() {
  try {
    // First drop the existing table if it exists
    console.log("Dropping existing feedback table if it exists...");
    await sql`DROP TABLE IF EXISTS feedback;`;
    
    console.log("Creating feedback table with correct schema...");
    
    // Create feedback table using direct SQL that matches our schema definition
    await sql`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name TEXT,
        email TEXT,
        type TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    
    console.log("Feedback table created successfully with correct schema!");
  } catch (error) {
    console.error("Error recreating feedback table:", error);
    process.exit(1);
  }
}

recreateFeedbackTable();