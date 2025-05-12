/**
 * Script to push feedback schema changes to database
 * This creates the necessary feedback table in the database
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

async function createFeedbackTable() {
  try {
    console.log("Creating feedback table...");
    
    // Create feedback table using direct SQL
    await sql`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    
    console.log("Feedback table created successfully!");
  } catch (error) {
    console.error("Error creating feedback table:", error);
    process.exit(1);
  }
}

createFeedbackTable();