const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

// Set up WebSocket for Neon database
neonConfig.webSocketConstructor = ws;

async function createTestTeam() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set");
    return;
  }

  // Create database connection
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("Creating test team and adding Olaya as admin...");
    
    // 1. Get Olaya's user ID
    const olayaResult = await pool.query(
      "SELECT id FROM users WHERE username = 'Olaya'"
    );
    
    if (olayaResult.rows.length === 0) {
      console.error("Olaya user not found");
      return;
    }
    
    const olayaId = olayaResult.rows[0].id;
    console.log(`Found Olaya user with ID: ${olayaId}`);
    
    // 2. Check if TEST team already exists
    const teamCheckResult = await pool.query(
      "SELECT id FROM teams WHERE name = 'TEST'"
    );
    
    let teamId;
    
    if (teamCheckResult.rows.length > 0) {
      // Team exists - update it
      teamId = teamCheckResult.rows[0].id;
      console.log(`TEST team already exists with ID: ${teamId}`);
      
      await pool.query(
        `UPDATE teams 
         SET division = 'Test Division', season_year = '2025' 
         WHERE id = $1`,
        [teamId]
      );
      console.log(`Updated TEST team`);
    } else {
      // Create new team
      console.log("Creating TEST team...");
      
      const teamInsertResult = await pool.query(
        `INSERT INTO teams 
           (name, owner_id, division, season_year, created_by_id, join_code, description, is_public, created_at, updated_at) 
         VALUES 
           ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING id`,
        ['TEST', olayaId, 'Test Division', '2025', olayaId, 'TEST123', 'Test team for development', true]
      );
      
      if (teamInsertResult.rows.length === 0) {
        console.error("Failed to create team, no ID returned");
        return;
      }
      
      teamId = teamInsertResult.rows[0].id;
      console.log(`Created TEST team with ID: ${teamId}`);
    }
    
    // 3. Check if Olaya is already a team member
    const memberCheckResult = await pool.query(
      `SELECT id, role FROM team_members 
       WHERE user_id = $1 AND team_id = $2`,
      [olayaId, teamId]
    );
    
    if (memberCheckResult.rows.length > 0) {
      const existingMember = memberCheckResult.rows[0];
      // Update role to admin if needed
      if (existingMember.role !== 'admin') {
        await pool.query(
          `UPDATE team_members 
           SET role = 'admin' 
           WHERE id = $1`,
          [existingMember.id]
        );
        console.log(`Updated Olaya's role to admin for team ${teamId}`);
      } else {
        console.log(`Olaya is already an admin for team ${teamId}`);
      }
    } else {
      // Add Olaya as admin to the team
      await pool.query(
        `INSERT INTO team_members (team_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, NOW())`,
        [teamId, olayaId, 'admin']
      );
      console.log(`Added Olaya as admin to team ${teamId}`);
    }
    
    console.log("Setup complete!");
    console.log(`Team: TEST (ID: ${teamId})`);
    console.log(`Admin: Olaya (ID: ${olayaId})`);
    
  } catch (error) {
    console.error("Error creating test team:", error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the script
createTestTeam().catch(console.error);