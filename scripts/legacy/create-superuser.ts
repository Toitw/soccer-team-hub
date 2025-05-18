import { EntityStorage } from "./server/entity-storage";
import * as argon2 from "argon2";

const SUPERUSER_USERNAME = "admin";
const SUPERUSER_PASSWORD = "password";
const SUPERUSER_FULL_NAME = "System Administrator";

/**
 * Hash a password using Argon2id (recommended for password hashing)
 * @param password - The plain password to hash
 * @returns The hashed password string with Argon2 parameters
 */
async function hashPassword(password: string): Promise<string> {
  try {
    // Using Argon2id which offers a balanced approach of resistance against side-channel and GPU attacks
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,  // 64 MB
      parallelism: 4,
      timeCost: 3,
    });
    
    return hash; // Argon2 hashes are self-contained with algorithm parameters and salt
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Password hashing failed");
  }
}

/**
 * Create a superuser account for admin panel access
 */
async function createSuperuser() {
  const storage = new EntityStorage();
  
  console.log("Checking if superuser exists...");
  
  // Check if superuser already exists
  const existingSuperuser = await storage.getUserByUsername(SUPERUSER_USERNAME);
  
  if (existingSuperuser) {
    if (existingSuperuser.role === "superuser") {
      console.log("Superuser account already exists.");
      return;
    }
    
    // Update the existing admin to superuser
    console.log("Upgrading existing admin to superuser...");
    const updatedUser = await storage.updateUser(existingSuperuser.id, {
      role: "superuser"
    });
    
    if (updatedUser) {
      console.log(`User "${SUPERUSER_USERNAME}" role upgraded to superuser`);
    } else {
      console.log("Failed to upgrade user role");
    }
    
    return;
  }
  
  // Create superuser user
  console.log("Creating superuser account...");
  
  const hashedPassword = await hashPassword(SUPERUSER_PASSWORD);
  
  const superuserData = {
    username: SUPERUSER_USERNAME,
    password: hashedPassword,
    fullName: SUPERUSER_FULL_NAME,
    role: "superuser",
    email: "admin@example.com"
  };
  
  try {
    const newSuperuser = await storage.createUser(superuserData);
    console.log(`Superuser created with ID: ${newSuperuser.id}`);
    console.log(`Username: ${SUPERUSER_USERNAME}`);
    console.log(`Password: ${SUPERUSER_PASSWORD}`);
  } catch (error) {
    console.error("Error creating superuser:", error);
  }
}

// Run the script
createSuperuser().catch(console.error);