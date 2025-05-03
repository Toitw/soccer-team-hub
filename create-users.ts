import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";
import * as argon2 from "argon2";

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
 * Create or update users in the database
 */
async function createOrUpdateUsers() {
  console.log("Updating admin password and creating test user...");

  try {
    // 1. Update admin password
    const adminUser = await db.select().from(users).where(eq(users.username, "admin")).limit(1);
    
    if (adminUser.length > 0) {
      console.log("Admin user found, updating password...");
      const hashedAdminPassword = await hashPassword("admin123");
      
      await db.update(users)
        .set({ 
          password: hashedAdminPassword,
          role: "superuser"
        })
        .where(eq(users.id, adminUser[0].id));
      
      console.log("Admin user password updated successfully!");
    } else {
      console.log("Admin user not found, creating new admin...");
      
      const hashedAdminPassword = await hashPassword("admin123");
      
      await db.insert(users).values({
        username: "admin",
        password: hashedAdminPassword,
        fullName: "Admin User",
        role: "superuser",
        email: "admin@example.com"
      });
      
      console.log("Admin user created successfully!");
    }

    // 2. Create test user Olaya
    const olayaUser = await db.select().from(users).where(eq(users.username, "Olaya")).limit(1);
    
    if (olayaUser.length > 0) {
      console.log("Olaya user found, updating password...");
      const hashedOlayaPassword = await hashPassword("hablador10%");
      
      await db.update(users)
        .set({ 
          password: hashedOlayaPassword
        })
        .where(eq(users.id, olayaUser[0].id));
      
      console.log("Olaya user password updated successfully!");
    } else {
      console.log("Olaya user not found, creating new user...");
      
      const hashedOlayaPassword = await hashPassword("hablador10%");
      
      await db.insert(users).values({
        username: "Olaya",
        password: hashedOlayaPassword,
        fullName: "Olaya Test",
        role: "player",
        email: "olaya@example.com"
      });
      
      console.log("Olaya user created successfully!");
    }

    console.log("User setup completed!");
    console.log("Admin - Username: admin, Password: admin123");
    console.log("Test User - Username: Olaya, Password: hablador10%");
  } catch (error) {
    console.error("Error creating/updating users:", error);
  }
}

// Run the script
createOrUpdateUsers().catch(console.error);