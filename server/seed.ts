import { db } from "./db";
import { users } from "../shared/schema";
import { sql } from "drizzle-orm";
import argon2 from "argon2";

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
    // Using Argon2id - a hybrid between Argon2i (resistant against side-channel attacks)
    // and Argon2d (resistant against GPU cracking attacks)
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456, // 19 MiB
      timeCost: 2, // 2 iterations
      parallelism: 1, // 1 thread
    });
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Failed to hash password");
  }
}

async function main() {
  console.log("🌱 Running seed function...");

  // Check if admin user exists
  const existingAdmin = await db.select()
    .from(users)
    .where(sql`username = ${ADMIN_USERNAME}`)
    .limit(1);

  if (existingAdmin.length > 0) {
    console.log("✅ Admin user already exists, skipping creation");
  } else {
    // Create admin user
    console.log("Creating admin user...");
    
    const hashedPassword = await hashPassword(ADMIN_PASSWORD);
    
    const [adminUser] = await db.insert(users)
      .values({
        username: ADMIN_USERNAME,
        password: hashedPassword,
        fullName: ADMIN_FULL_NAME,
        role: "admin",
      })
      .returning();
    
    console.log(`✅ Admin user created with ID: ${adminUser.id}`);
  }

  console.log("✅ Seed completed successfully");
}

// Export for programmatic usage
export default main;

// If this module is executed directly via CLI
// This works in ES modules context (instead of require.main === module)
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Seed failed:", error);
      process.exit(1);
    });
}