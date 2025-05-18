import { db } from "./server/db";
import { users, teams, teamMembers } from "./shared/schema";
import { eq } from "drizzle-orm";

/**
 * Create a test team and add Olaya as admin
 */
async function createTestTeam() {
  console.log("Creating test team and adding Olaya as admin...");
  
  try {
    // 1. Get Olaya's user ID
    const [olayaUser] = await db.select().from(users).where(eq(users.username, "Olaya"));
    
    if (!olayaUser) {
      console.error("Olaya user not found");
      return;
    }
    
    console.log(`Found Olaya user with ID: ${olayaUser.id}`);
    
    // Direct SQL approach to create the team correctly
    const teamResult = await db.execute(`
      INSERT INTO teams 
        (name, owner_id, division, season_year, created_by_id, join_code, description, is_public, created_at, updated_at) 
      VALUES 
        ('TEST', ${olayaUser.id}, 'Test Division', '2025', ${olayaUser.id}, 'TEST123', 'Test team for development', true, NOW(), NOW())
      ON CONFLICT (name) DO UPDATE SET
        division = 'Test Division',
        season_year = '2025'
      RETURNING id;
    `);
    
    if (!teamResult.rows || teamResult.rows.length === 0) {
      console.error("Failed to create team, no ID returned");
      return;
    }
    
    const teamId = teamResult.rows[0].id;
    console.log(`Team created or updated with ID: ${teamId}`);
    
    // Check if team member relationship exists
    const memberResult = await db.execute(`
      SELECT id, role FROM team_members 
      WHERE user_id = ${olayaUser.id} AND team_id = ${teamId}
    `);
    
    if (memberResult.rows && memberResult.rows.length > 0) {
      const existingMember = memberResult.rows[0];
      // Update role to admin if needed
      if (existingMember.role !== 'admin') {
        await db.execute(`
          UPDATE team_members 
          SET role = 'admin' 
          WHERE id = ${existingMember.id}
        `);
        console.log(`Updated Olaya's role to admin for team ${teamId}`);
      } else {
        console.log(`Olaya is already an admin for team ${teamId}`);
      }
    } else {
      // Create new team member relationship
      await db.execute(`
        INSERT INTO team_members (team_id, user_id, role, joined_at)
        VALUES (${teamId}, ${olayaUser.id}, 'admin', NOW())
      `);
      console.log(`Added Olaya as admin to team ${teamId}`);
    }
    
    console.log("Setup complete!");
    console.log(`Team: TEST (ID: ${teamId})`);
    console.log(`Admin: Olaya (ID: ${olayaUser.id})`);
    
  } catch (error) {
    console.error("Error creating test team:", error);
  }
}

// Run the script
createTestTeam().catch(console.error);