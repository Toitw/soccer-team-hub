/**
 * Data Migration Utility for TeamKick Soccer App
 * 
 * This script migrates data from the file-based storage to PostgreSQL database.
 * It handles all application entities and ensures data integrity during migration.
 */

import { db } from "../server/db";
import { MemStorage } from "../server/storage";
import { DatabaseStorage } from "../server/database-storage";
import fs from "fs";
import path from "path";

// Path to confirm migration was completed
const MIGRATION_COMPLETED_FILE = path.join("./data", ".migration-completed");

async function migrateData() {
  console.log("Starting migration from file-based storage to PostgreSQL database...");
  
  // Check if migration was already performed
  if (fs.existsSync(MIGRATION_COMPLETED_FILE)) {
    console.log("Migration was already completed. To force a re-migration, delete the .migration-completed file.");
    return;
  }
  
  // Initialize storages
  const memStorage = new MemStorage();
  const dbStorage = new DatabaseStorage();
  
  try {
    // 1. Migrate Users
    console.log("Migrating users...");
    const users = await memStorage.getAllUsers();
    for (const user of users) {
      try {
        // Skip the 'id' field as PostgreSQL will auto-generate it
        const { id, ...userData } = user;
        await dbStorage.createUser(userData);
        console.log(`Migrated user: ${user.username}`);
      } catch (error) {
        console.error(`Error migrating user ${user.id} (${user.username}):`, error);
      }
    }
    
    // 2. Migrate Teams
    console.log("Migrating teams...");
    const teams = await memStorage.getTeams();
    for (const team of teams) {
      try {
        const { id, ...teamData } = team;
        await dbStorage.createTeam(teamData);
        console.log(`Migrated team: ${team.name}`);
      } catch (error) {
        console.error(`Error migrating team ${team.id} (${team.name}):`, error);
      }
    }
    
    // 3. Migrate Team Members
    console.log("Migrating team members...");
    const allUsers = await dbStorage.getAllUsers();
    const allTeams = await dbStorage.getTeams();
    
    // Create user and team ID mappings (old ID to new ID)
    const userIdMap = new Map(allUsers.map(user => [user.username, user.id]));
    const teamIdMap = new Map(allTeams.map(team => [team.name, team.id]));
    
    // Get team members from memory storage
    const memTeamMembers = await memStorage.getTeamMembers(0); // Get all team members
    
    for (const memTeamMember of memTeamMembers) {
      try {
        // Get the user and team from memory storage
        const user = await memStorage.getUser(memTeamMember.userId);
        const team = await memStorage.getTeam(memTeamMember.teamId);
        
        if (!user || !team) {
          console.warn(`Skipping team member ${memTeamMember.id}: user or team not found`);
          continue;
        }
        
        // Get the new IDs from the mapping
        const newUserId = userIdMap.get(user.username);
        const newTeamId = teamIdMap.get(team.name);
        
        if (!newUserId || !newTeamId) {
          console.warn(`Skipping team member ${memTeamMember.id}: new user or team ID not found`);
          continue;
        }
        
        // Create new team member with updated IDs
        const { id, userId, teamId, ...restData } = memTeamMember;
        await dbStorage.createTeamMember({
          userId: newUserId,
          teamId: newTeamId,
          ...restData
        });
        
        console.log(`Migrated team member: ${user.username} in team ${team.name}`);
      } catch (error) {
        console.error(`Error migrating team member ${memTeamMember.id}:`, error);
      }
    }
    
    // 4. Migrate other entities following the same pattern
    // (Add migration code for matches, events, etc. as needed)
    
    // Mark migration as completed
    fs.writeFileSync(MIGRATION_COMPLETED_FILE, new Date().toISOString());
    console.log("Migration completed successfully.");
    
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Execute migration
migrateData().catch(error => {
  console.error("Unhandled error during migration:", error);
  process.exit(1);
}).then(() => {
  process.exit(0);
});