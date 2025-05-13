/**
 * Script to add missing columns to team_members table
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { pool } from "../server/db";

async function getTableColumns(tableName: string) {
  try {
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [tableName]);
    
    return result.rows.map(row => row.column_name);
  } catch (err) {
    console.error(`Error fetching columns for ${tableName}:`, err);
    return [];
  }
}

async function addMissingColumns() {
  console.log("Starting to add missing columns to team_members table...");
  
  try {
    // Check current state of the database
    const teamMembersColumns = await getTableColumns('team_members');
    console.log("Current team_members columns:", teamMembersColumns);
    
    // Define required columns
    const hasPosition = teamMembersColumns.includes('position');
    const hasJerseyNumber = teamMembersColumns.includes('jersey_number');
    const hasProfilePicture = teamMembersColumns.includes('profile_picture');
    const hasCreatedById = teamMembersColumns.includes('created_by_id');
    const hasCreatedAt = teamMembersColumns.includes('created_at');
    
    console.log("Column check:", {
      hasPosition, hasJerseyNumber, hasProfilePicture, hasCreatedById, hasCreatedAt
    });
    
    // Add missing columns
    if (!hasPosition) {
      try {
        await db.execute(sql`ALTER TABLE team_members ADD COLUMN position TEXT`);
        console.log("Added position column to team_members");
      } catch (err) {
        console.error("Error adding position column:", err);
      }
    }
    
    if (!hasJerseyNumber) {
      try {
        await db.execute(sql`ALTER TABLE team_members ADD COLUMN jersey_number INTEGER`);
        console.log("Added jersey_number column to team_members");
      } catch (err) {
        console.error("Error adding jersey_number column:", err);
      }
    }
    
    if (!hasProfilePicture) {
      try {
        await db.execute(sql`ALTER TABLE team_members ADD COLUMN profile_picture TEXT`);
        console.log("Added profile_picture column to team_members");
      } catch (err) {
        console.error("Error adding profile_picture column:", err);
      }
    }
    
    if (!hasCreatedById) {
      try {
        await db.execute(sql`ALTER TABLE team_members ADD COLUMN created_by_id INTEGER`);
        console.log("Added created_by_id column to team_members");
      } catch (err) {
        console.error("Error adding created_by_id column:", err);
      }
    }
    
    if (!hasCreatedAt) {
      try {
        await db.execute(sql`ALTER TABLE team_members ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW()`);
        console.log("Added created_at column to team_members");
      } catch (err) {
        console.error("Error adding created_at column:", err);
      }
    }
    
    console.log("Column addition completed successfully!");
  } catch (error) {
    console.error("Error during column addition:", error);
    throw error;
  }
}

// Run the migration
addMissingColumns()
  .then(() => {
    console.log("All missing columns added successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to add columns:", error);
    process.exit(1);
  });