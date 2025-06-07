import { storage } from "../server/storage.js";
import { hashPassword, isMockUsername } from "../shared/js-utils.js";
// La función hashPassword ya fue actualizada para usar Argon2id en shared/js-utils.js

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (() => {
  throw new Error("ADMIN_PASSWORD environment variable is required for security");
})();
const ADMIN_FULL_NAME = "System Administrator";

/**
 * Initialize the admin user if it doesn't exist
 */
export async function initializeAdmin() {
  console.log("Checking if admin user exists...");
  
  // Check if admin user exists
  const adminUser = await storage.getUserByUsername(ADMIN_USERNAME);
  
  if (adminUser) {
    console.log("Admin user already exists");
    return;
  }
  
  // Create admin user
  console.log("Creating admin user...");
  
  const hashedPassword = await hashPassword(ADMIN_PASSWORD);
  
  const adminData = {
    username: ADMIN_USERNAME,
    password: hashedPassword,
    fullName: ADMIN_FULL_NAME,
    role: "admin",
  };
  
  const newAdmin = await storage.createUser(adminData);
  console.log(`Admin user created with ID: ${newAdmin.id}`);
}

/**
 * This function removes duplicate team members
 * It looks for multiple entries with the same teamId and userId and keeps only the first one
 */
export async function removeDuplicateMembers() {
  console.log("Removing duplicate team members...");
  
  try {
    // Get all team members
    const allTeamMembers = await storage.getTeamMembers();
    console.log(`Total team members before cleaning: ${allTeamMembers.length}`);
    
    // Track processed combinations
    const processedCombinations = new Set();
    const duplicates = [];
    
    // Identify duplicates
    for (const member of allTeamMembers) {
      const key = `${member.teamId}-${member.userId}`;
      
      if (processedCombinations.has(key)) {
        duplicates.push(member.id);
      } else {
        processedCombinations.add(key);
      }
    }
    
    // Remove duplicates
    for (const id of duplicates) {
      console.log(`Removing duplicate team member with ID: ${id}`);
      await storage.deleteTeamMember(id);
    }
    
    console.log(`Removed ${duplicates.length} duplicate team members`);
  } catch (error) {
    console.error("Error removing duplicate team members:", error);
  }
}

/**
 * Create test users for development and testing
 */
export async function createTestUsers() {
  console.log("Creating test users...");
  
  try {
    // Create a coach user
    const coachData = {
      username: "test_coach",
      password: await hashPassword('coach123'),
      fullName: "Test Coach",
      role: "coach",
      email: "coach@example.com",
      phoneNumber: "555-123-4567",
    };
    
    const coachExists = await storage.getUserByUsername(coachData.username);
    
    if (!coachExists) {
      const coach = await storage.createUser(coachData);
      console.log(`Coach user created with ID: ${coach.id}`);
    } else {
      console.log("Coach user already exists");
    }
    
    // Create player users
    const playerData = {
      username: "test_player",
      password: await hashPassword('player123'),
      fullName: "Test Player",
      role: "player",
      position: "Forward",
      jerseyNumber: 10,
      email: "player@example.com",
      phoneNumber: "555-987-6543",
    };
    
    const playerExists = await storage.getUserByUsername(playerData.username);
    
    if (!playerExists) {
      const player = await storage.createUser(playerData);
      console.log(`Player user created with ID: ${player.id}`);
    } else {
      console.log("Player user already exists");
    }
    
    console.log("Test users creation complete");
  } catch (error) {
    console.error("Error creating test users:", error);
  }
}

/**
 * Remove all mock users from the database
 */
export async function removeMockUsers() {
  console.log("Removing mock users...");
  
  try {
    // Get all users
    const allUsers = await storage.getUsers();
    
    // Identify mock users
    const mockUsers = allUsers.filter(user => isMockUsername(user.username));
    console.log(`Found ${mockUsers.length} mock users to remove`);
    
    // Remove each mock user
    for (const user of mockUsers) {
      // First remove any team memberships
      const teamMemberships = await storage.getTeamMembershipsByUserId(user.id);
      for (const membership of teamMemberships) {
        await storage.deleteTeamMember(membership.id);
      }
      
      // Then remove the user
      await storage.deleteUser(user.id);
      console.log(`Removed mock user: ${user.username} (ID: ${user.id})`);
    }
    
    console.log("Mock user removal complete");
  } catch (error) {
    console.error("Error removing mock users:", error);
  }
}

/**
 * Clean up duplicate data in other collections
 */
export async function cleanDuplicates() {
  console.log("Cleaning up duplicate data...");
  
  // Remove duplicate team members
  await removeDuplicateMembers();
  
  console.log("Duplicate cleanup complete");
}