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

async function runMigration() {
  console.log("Starting Member-User schema update...");
  
  try {
    // Check current state of the database
    const teamMembersColumns = await getTableColumns('team_members');
    console.log("Current team_members columns:", teamMembersColumns);
    
    // Check if the backup table already exists
    const backupResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'team_members_backup'
      )
    `);
    const backupExists = backupResult.rows[0].exists;
    
    if (!backupExists) {
      // Backup existing team_members table
      console.log("Backing up existing team_members table...");
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS team_members_backup AS 
        SELECT * FROM team_members
      `);
      console.log("Backup created successfully: team_members_backup");
    } else {
      console.log("Backup table already exists, skipping backup creation.");
    }
    
    // Check if the tables exist already
    const teamUsersResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'team_users'
      )
    `);
    const teamUsersExists = teamUsersResult.rows[0].exists;
    
    if (!teamUsersExists) {
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
    } else {
      console.log("team_users table already exists, skipping creation.");
    }
    
    const memberClaimsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'member_claims'
      )
    `);
    const memberClaimsExists = memberClaimsResult.rows[0].exists;
    
    if (!memberClaimsExists) {
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
    } else {
      console.log("member_claims table already exists, skipping creation.");
    }
    
    // Check if team_members table has the new structure
    const hasFullName = teamMembersColumns.includes('full_name');
    const hasIsVerified = teamMembersColumns.includes('is_verified');
    const hasPosition = teamMembersColumns.includes('position');
    const hasJerseyNumber = teamMembersColumns.includes('jersey_number');
    const hasProfilePicture = teamMembersColumns.includes('profile_picture');
    const hasCreatedById = teamMembersColumns.includes('created_by_id');
    const hasCreatedAt = teamMembersColumns.includes('created_at');
    
    const hasNewStructure = hasFullName && hasIsVerified && hasPosition && hasJerseyNumber && 
                           hasProfilePicture && hasCreatedById && hasCreatedAt;
    
    console.log("Structure check:", {
      hasFullName, hasIsVerified, hasPosition, hasJerseyNumber,
      hasProfilePicture, hasCreatedById, hasCreatedAt, hasNewStructure
    });
    
    // Add missing columns
    console.log("Updating team_members table structure...");
    
    // Add columns instead of recreating the table to preserve data
    if (!hasFullName) {
      try {
        await db.execute(sql`ALTER TABLE team_members ADD COLUMN full_name TEXT`);
        console.log("Added full_name column to team_members");
      } catch (err) {
        console.error("Error adding full_name column:", err);
      }
    }
    
    if (!hasIsVerified) {
      try {
        await db.execute(sql`ALTER TABLE team_members ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE`);
        console.log("Added is_verified column to team_members");
      } catch (err) {
        console.error("Error adding is_verified column:", err);
      }
    }
    
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
    
    // Update full_name with data from users table 
    try {
      await db.execute(sql`
        UPDATE team_members tm
        SET full_name = u.full_name
        FROM users u
        WHERE tm.user_id = u.id AND tm.full_name IS NULL
      `);
      console.log("Updated full_name values in team_members table");
    } catch (err) {
      console.error("Error updating full_name values:", err);
    }
    
    // Migrate data to team_users if not already done
    if (!teamUsersExists) {
      console.log("Migrating existing team members to team_users table...");
      try {
        // Populate team_users based on existing team memberships
        await db.execute(sql`
          INSERT INTO team_users (team_id, user_id)
          SELECT DISTINCT team_id, user_id FROM team_members
          WHERE user_id IS NOT NULL
        `);
        console.log("Team users populated successfully");
      } catch (err) {
        console.error("Error populating team_users:", err);
      }
    }
    
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
    console.error("Migration failed:", error);
    process.exit(1);
  });
    console.log("Member-User schema update completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to update Member-User schema:", error);
    process.exit(1);
  });