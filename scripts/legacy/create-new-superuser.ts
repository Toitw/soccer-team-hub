import { EntityStorage } from "./server/entity-storage";
import { hashPassword } from "./server/auth";

const SUPERUSER_USERNAME = "superadmin";
const SUPERUSER_PASSWORD = "adminpass";
const SUPERUSER_FULL_NAME = "Super Administrator";

/**
 * Create a brand new superuser account for admin panel access
 */
async function createNewSuperuser() {
  const storage = new EntityStorage();
  
  console.log("Checking if superuser exists...");
  
  // Check if superuser already exists
  const existingSuperuser = await storage.getUserByUsername(SUPERUSER_USERNAME);
  
  if (existingSuperuser) {
    console.log("Superuser account already exists.");
    console.log(`Username: ${SUPERUSER_USERNAME}`);
    console.log(`Password: ${SUPERUSER_PASSWORD}`);
    return;
  }
  
  // Create superuser user
  console.log("Creating new superuser account...");
  
  const hashedPassword = await hashPassword(SUPERUSER_PASSWORD);
  
  const superuserData = {
    username: SUPERUSER_USERNAME,
    password: hashedPassword,
    fullName: SUPERUSER_FULL_NAME,
    role: "superuser",
    email: "superadmin@example.com"
  };
  
  try {
    const newSuperuser = await storage.createUser(superuserData);
    console.log(`Superuser created with ID: ${newSuperuser.id}`);
    console.log(`Username: ${SUPERUSER_USERNAME}`);
    console.log(`Password: ${SUPERUSER_PASSWORD}`);
    console.log("\nUse these credentials to login and access the admin panel at /admin");
  } catch (error) {
    console.error("Error creating superuser:", error);
  }
}

// Run the script
createNewSuperuser().catch(console.error);