import { EntityStorage } from "./server/entity-storage";
import { comparePasswords } from "./server/auth";

// Test different usernames and passwords
async function testLoginCredentials() {
  const storage = new EntityStorage();
  
  // List of test credentials to check
  const testCases = [
    { username: "admin", password: "password" },
    { username: "admin", password: "admin123" },
    { username: "superadmin", password: "adminpass" },
    { username: "juroga", password: "mypassword" } // Just a sample, replace with known working creds
  ];
  
  console.log("Testing login credentials...\n");
  
  for (const test of testCases) {
    console.log(`Testing username: ${test.username}, password: ${test.password}`);
    
    // Get user from storage
    const user = await storage.getUserByUsername(test.username);
    
    if (!user) {
      console.log(`  Result: FAIL - User '${test.username}' not found in storage`);
      continue;
    }
    
    // Check password
    const passwordMatch = await comparePasswords(test.password, user.password);
    
    if (passwordMatch) {
      console.log(`  Result: SUCCESS - Login successful for ${test.username}`);
      console.log(`  User details: ${user.fullName}, role: ${user.role}, id: ${user.id}`);
    } else {
      console.log(`  Result: FAIL - Password incorrect for ${test.username}`);
    }
    
    console.log();
  }
  
  // List all users in the system for reference
  console.log("\nAll users in the system:");
  const users = await storage.getAllUsers();
  users.forEach(user => {
    console.log(`- ${user.username} (${user.fullName}), role: ${user.role}, id: ${user.id}`);
  });
}

// Run the tests
testLoginCredentials().catch(console.error);