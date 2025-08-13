#!/usr/bin/env tsx

/**
 * Legacy Password Migration Tracker
 * 
 * This script identifies users who still have legacy password formats
 * and provides statistics on the migration progress.
 */

import { storage } from "../server/storage-implementation";
import { isLegacyPasswordFormat } from "../server/auth";

async function checkLegacyPasswords() {
  console.log("🔍 Checking for users with legacy password formats...\n");
  
  try {
    // Get all users from storage
    const users = await storage.getAllUsers();
    
    let totalUsers = users.length;
    let legacyUsers = 0;
    let argon2Users = 0;
    let unknownUsers = 0;
    
    const legacyUsersList: Array<{ username: string; format: string }> = [];
    
    for (const user of users) {
      if (!user.password) {
        unknownUsers++;
        continue;
      }
      
      if (isLegacyPasswordFormat(user.password)) {
        legacyUsers++;
        
        // Determine specific legacy format
        let format = "unknown";
        if (user.password.includes('.')) {
          format = "scrypt (hash.salt)";
        } else if (user.password.includes(':')) {
          format = "scrypt (salt:hash)";
        } else if (!user.password.startsWith('$argon2')) {
          format = "other legacy";
        }
        
        legacyUsersList.push({
          username: user.username,
          format: format
        });
      } else if (user.password.startsWith('$argon2')) {
        argon2Users++;
      } else {
        unknownUsers++;
      }
    }
    
    // Display statistics
    console.log("📊 Password Format Statistics:");
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Argon2id (Modern): ${argon2Users} (${((argon2Users / totalUsers) * 100).toFixed(1)}%)`);
    console.log(`   Legacy Formats: ${legacyUsers} (${((legacyUsers / totalUsers) * 100).toFixed(1)}%)`);
    console.log(`   No Password/Unknown: ${unknownUsers} (${((unknownUsers / totalUsers) * 100).toFixed(1)}%)`);
    
    if (legacyUsers > 0) {
      console.log(`\n⚠️  Users requiring migration (${legacyUsers}):`);
      legacyUsersList.forEach(user => {
        console.log(`   - ${user.username} (${user.format})`);
      });
      
      console.log(`\n💡 Migration Strategy:`);
      console.log(`   • Legacy users will be automatically upgraded to Argon2id on next login`);
      console.log(`   • No manual intervention required`);
      console.log(`   • Migration logs appear in server console during login`);
    } else {
      console.log(`\n✅ All users are using modern Argon2id password hashes!`);
    }
    
  } catch (error) {
    console.error("❌ Error checking legacy passwords:", error);
    process.exit(1);
  }
}

// Run the check
checkLegacyPasswords()
  .then(() => {
    console.log(`\n✅ Legacy password check completed.`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });