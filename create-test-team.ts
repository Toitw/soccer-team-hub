import { db } from "./server/db";
import { teams, teamMembers } from "./shared/schema";
import { eq } from "drizzle-orm";

/**
 * Create a test team and add Olaya as admin
 */
async function createTestTeam() {
  console.log("Creating test team and adding Olaya as admin...");
  
  try {
    // 1. Get Olaya's user ID
    const olayaUser = await db.query.users.findFirst({
      where: eq(users.username, "Olaya")
    });
    
    if (!olayaUser) {
      console.error("Olaya user not found");
      return;
    }
    
    console.log(`Found Olaya user with ID: ${olayaUser.id}`);
    
    // 2. Check if TEST team already exists
    const existingTeam = await db.query.teams.findFirst({
      where: eq(teams.name, "TEST")
    });
    
    let teamId: number;
    
    if (existingTeam) {
      console.log(`TEST team already exists with ID: ${existingTeam.id}`);
      teamId = existingTeam.id;
    } else {
      // 3. Create the TEST team
      console.log("Creating TEST team...");
      
      // Need to make a direct SQL query to insert with all required fields
      const result = await db.execute(
        `INSERT INTO teams (name, owner_id, division, season_year, created_by_id, join_code, is_public, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
         RETURNING id`,
        ["TEST", olayaUser.id, "Test Division", "2025", olayaUser.id, "TEST123", true]
      );
      
      teamId = result.rows[0].id;
      console.log(`Created TEST team with ID: ${teamId}`);
    }
    
    // 4. Check if Olaya is already a team member
    const existingMember = await db.query.teamMembers.findFirst({
      where: (tm) => 
        eq(tm.userId, olayaUser.id) && 
        eq(tm.teamId, teamId)
    });
    
    if (existingMember) {
      // Update to admin role if needed
      if (existingMember.role !== "admin") {
        console.log("Updating Olaya to admin role...");
        await db.update(teamMembers)
          .set({ role: "admin" })
          .where(eq(teamMembers.id, existingMember.id));
        console.log("Olaya updated to admin role");
      } else {
        console.log("Olaya is already an admin for the team");
      }
    } else {
      // Add Olaya as admin
      console.log("Adding Olaya as admin to the team...");
      await db.insert(teamMembers).values({
        teamId: teamId,
        userId: olayaUser.id,
        role: "admin"
      });
      console.log("Olaya added as admin");
    }
    
    console.log("Setup complete!");
    console.log(`Team: TEST (ID: ${teamId})`);
    console.log(`Admin: Olaya (ID: ${olayaUser.id})`);
    
  } catch (error) {
    console.error("Error creating test team:", error);
  }
}

// Import statements to avoid errors
import { users } from "./shared/schema";

// Run the script
createTestTeam().catch(console.error);