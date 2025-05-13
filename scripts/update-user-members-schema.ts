/**
 * Database Migration Script for Team Members-Users Restructuring
 * 
 * This script updates the database schema to implement the new member-user relationship model:
 * 1. Creates new team_users table for users who have joined teams
 * 2. Creates new member_claims table for tracking user claims to be team members
 * 3. Updates team_members table structure
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function runMigration() {
  console.log("Starting Member-User schema update...");
  
  try {
    // Backup existing team_members table
    console.log("Backing up existing team_members table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS team_members_backup AS 
      SELECT * FROM team_members
    `);
    console.log("Backup created successfully: team_members_backup");
    
    // Drop existing team_members table
    console.log("Dropping existing team_members table...");
    await db.execute(sql`DROP TABLE IF EXISTS team_members CASCADE`);
    console.log("Table dropped successfully");
    
    // Create new team_members table with updated structure
    console.log("Creating new team_members table...");
    await db.execute(sql`
      CREATE TABLE team_members (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'player',
        position TEXT,
        jersey_number INTEGER,
        profile_picture TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_by_id INTEGER NOT NULL,
        user_id INTEGER,
        is_verified BOOLEAN NOT NULL DEFAULT FALSE,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by_id) REFERENCES users(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log("New team_members table created successfully");
    
    // Create team_users table
    console.log("Creating team_users table...");
    await db.execute(sql`
      CREATE TABLE team_users (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(team_id, user_id)
      )
    `);
    console.log("team_users table created successfully");
    
    // Create member_claims table
    console.log("Creating member_claims table...");
    await db.execute(sql`
      CREATE TABLE member_claims (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL,
        team_member_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMP,
        reviewed_by_id INTEGER,
        rejection_reason TEXT,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by_id) REFERENCES users(id),
        UNIQUE(team_member_id, user_id)
      )
    `);
    console.log("member_claims table created successfully");
    
    // Migrate data from backup to new team_members table
    console.log("Migrating data from backup to new tables...");
    
    // First, populate team_users based on existing team memberships
    await db.execute(sql`
      INSERT INTO team_users (team_id, user_id)
      SELECT DISTINCT team_id, user_id FROM team_members_backup
    `);
    console.log("Team users populated successfully");
    
    // Then create team_members records with admin as creator
    await db.execute(sql`
      INSERT INTO team_members (team_id, full_name, role, position, jersey_number, created_by_id, user_id, is_verified)
      SELECT 
        tm.team_id, 
        u.full_name, 
        tm.role, 
        u.position, 
        u.jersey_number,
        (SELECT id FROM users WHERE role = 'admin' LIMIT 1), -- Default to first admin
        tm.user_id,
        TRUE -- Mark as verified since we know these users exist
      FROM team_members_backup tm
      JOIN users u ON tm.user_id = u.id
    `);
    console.log("Team members migrated successfully");
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
    throw error;
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log("Member-User schema update completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to update Member-User schema:", error);
    process.exit(1);
  });