
import { Pool, neonConfig } from '@neondatabase/serverless';
import { config } from 'dotenv';
import ws from 'ws';

// Configure Neon database to use WebSocket
neonConfig.webSocketConstructor = ws;

config();

async function cleanupMyTeams() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("Finding teams named 'My Team'...");
    
    // First get all teams named "My Team"
    const { rows: teams } = await pool.query(
      "SELECT id, name FROM teams WHERE name = 'My Team'"
    );
    
    console.log(`Found ${teams.length} teams to delete`);
    
    for (const team of teams) {
      console.log(`Deleting team ${team.id}`);
      
      // Delete related records first
      await pool.query("DELETE FROM team_members WHERE team_id = $1", [team.id]);
      await pool.query("DELETE FROM matches WHERE team_id = $1", [team.id]);
      await pool.query("DELETE FROM events WHERE team_id = $1", [team.id]);
      await pool.query("DELETE FROM announcements WHERE team_id = $1", [team.id]);
      await pool.query("DELETE FROM league_classification WHERE team_id = $1", [team.id]);
      await pool.query("DELETE FROM team_users WHERE team_id = $1", [team.id]);
      
      // Finally delete the team
      await pool.query("DELETE FROM teams WHERE id = $1", [team.id]);
      
      console.log(`Successfully deleted team ${team.id} and all related data`);
    }

    console.log("Cleanup completed successfully");
  } catch (error) {
    console.error("Error during cleanup:", error);
  } finally {
    await pool.end();
  }
}

cleanupMyTeams().catch(console.error);
