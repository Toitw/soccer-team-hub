import { EntityStorage } from "./server/entity-storage";
import { hashPassword } from "./server/auth";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";
const ADMIN_FULL_NAME = "System Administrator";

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