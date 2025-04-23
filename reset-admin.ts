import { EntityStorage } from "./server/entity-storage";
import * as argon2 from "argon2";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";
const ADMIN_FULL_NAME = "System Administrator";

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
 * Reset the admin user password and ensure it has superuser role
 */
async function resetAdmin() {
  const storage = new EntityStorage();
  
  console.log("Finding admin user...");
  
  // Check if admin already exists
  const adminUser = await storage.getUserByUsername(ADMIN_USERNAME);
  
  if (!adminUser) {
    console.log("Admin user not found. Cannot reset.");
    return;
  }
  
  console.log(`Found admin user with ID: ${adminUser.id}`);
  
  // Reset password and ensure superuser role
  const hashedPassword = await hashPassword(ADMIN_PASSWORD);
  
  const updatedUser = await storage.updateUser(adminUser.id, {
    password: hashedPassword,
    role: "superuser"
  });
  
  if (updatedUser) {
    console.log("Admin user reset successfully!");
    console.log(`Username: ${ADMIN_USERNAME}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log(`Role: ${updatedUser.role}`);
    console.log("\nPlease use these credentials to log in.");
  } else {
    console.log("Failed to update admin user");
  }
}

// Run the script
resetAdmin().catch(console.error);