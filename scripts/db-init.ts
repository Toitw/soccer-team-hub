/**
 * Database Initialization Script
 * This script creates the necessary database schema
 */
import { db } from '../server/db';
import * as schema from '../shared/schema';
import { sql } from 'drizzle-orm';

async function initDatabase() {
  console.log('Initializing database schema...');
  
  try {
    // Create users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        profile_picture TEXT,
        position TEXT,
        jersey_number INTEGER,
        email TEXT,
        phone_number TEXT,
        bio TEXT,
        verification_token TEXT,
        verification_token_expiry TIMESTAMP,
        is_email_verified BOOLEAN DEFAULT FALSE,
        reset_password_token TEXT,
        reset_password_token_expiry TIMESTAMP,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Users table created');
    
    // Create teams table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sport VARCHAR(100) NOT NULL,
        logo TEXT,
        colors JSONB,
        join_code VARCHAR(20) UNIQUE,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    console.log('Teams table created');
    
    // Create team_members table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        role VARCHAR(50) NOT NULL,
        position TEXT,
        jersey_number INTEGER,
        joined_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (team_id) REFERENCES teams(id),
        UNIQUE(user_id, team_id)
      )
    `);
    console.log('Team members table created');
    
    // Create matches table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL,
        opponent_name VARCHAR(255) NOT NULL,
        opponent_logo TEXT,
        match_date TIMESTAMP NOT NULL,
        location VARCHAR(255) NOT NULL,
        is_home BOOLEAN NOT NULL,
        goals_scored INTEGER,
        goals_conceded INTEGER,
        match_type VARCHAR(50) NOT NULL,
        notes TEXT,
        FOREIGN KEY (team_id) REFERENCES teams(id)
      )
    `);
    console.log('Matches table created');
    
    // Create events table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_type VARCHAR(50) NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (team_id) REFERENCES teams(id)
      )
    `);
    console.log('Events table created');
    
    // Create attendance table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        event_id INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (event_id) REFERENCES events(id),
        UNIQUE(user_id, event_id)
      )
    `);
    console.log('Attendance table created');
    
    // Create player_stats table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS player_stats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        match_id INTEGER NOT NULL,
        minutes_played INTEGER,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0, 
        yellow_cards INTEGER DEFAULT 0,
        red_cards INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (match_id) REFERENCES matches(id)
      )
    `);
    console.log('Player stats table created');
    
    // Create announcements table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL,
        created_by_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (team_id) REFERENCES teams(id),
        FOREIGN KEY (created_by_id) REFERENCES users(id)
      )
    `);
    console.log('Announcements table created');
    
    // Create invitations table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS invitations (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL,
        email VARCHAR(255) NOT NULL,
        invitation_code VARCHAR(50) NOT NULL,
        role VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        expiry_date TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id)
      )
    `);
    console.log('Invitations table created');
    
    // Create match_lineups table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS match_lineups (
        id SERIAL PRIMARY KEY,
        match_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        player_ids INTEGER[] NOT NULL,
        bench_player_ids INTEGER[],
        formation VARCHAR(50),
        position_mapping JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (match_id) REFERENCES matches(id),
        FOREIGN KEY (team_id) REFERENCES teams(id)
      )
    `);
    console.log('Match lineups table created');
    
    // Create team_lineups table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS team_lineups (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL,
        formation VARCHAR(50) NOT NULL,
        position_mapping JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (team_id) REFERENCES teams(id)
      )
    `);
    console.log('Team lineups table created');
    
    // Create match_substitutions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS match_substitutions (
        id SERIAL PRIMARY KEY,
        match_id INTEGER NOT NULL,
        player_in_id INTEGER NOT NULL,
        player_out_id INTEGER NOT NULL,
        minute INTEGER NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (match_id) REFERENCES matches(id),
        FOREIGN KEY (player_in_id) REFERENCES users(id),
        FOREIGN KEY (player_out_id) REFERENCES users(id)
      )
    `);
    console.log('Match substitutions table created');
    
    // Create match_goals table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS match_goals (
        id SERIAL PRIMARY KEY,
        match_id INTEGER NOT NULL,
        scorer_id INTEGER NOT NULL,
        assister_id INTEGER,
        minute INTEGER NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (match_id) REFERENCES matches(id),
        FOREIGN KEY (scorer_id) REFERENCES users(id),
        FOREIGN KEY (assister_id) REFERENCES users(id)
      )
    `);
    console.log('Match goals table created');
    
    // Create match_cards table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS match_cards (
        id SERIAL PRIMARY KEY,
        match_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        card_type VARCHAR(20) NOT NULL,
        minute INTEGER NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (match_id) REFERENCES matches(id),
        FOREIGN KEY (player_id) REFERENCES users(id)
      )
    `);
    console.log('Match cards table created');
    
    // Create match_photos table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS match_photos (
        id SERIAL PRIMARY KEY,
        match_id INTEGER NOT NULL,
        image_url TEXT NOT NULL,
        caption TEXT,
        uploaded_by_id INTEGER NOT NULL,
        uploaded_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (match_id) REFERENCES matches(id),
        FOREIGN KEY (uploaded_by_id) REFERENCES users(id)
      )
    `);
    console.log('Match photos table created');
    
    // Create league_classification table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS league_classification (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL,
        external_team_name VARCHAR(255) NOT NULL,
        position INTEGER,
        points INTEGER NOT NULL,
        games_played INTEGER,
        games_won INTEGER,
        games_drawn INTEGER,
        games_lost INTEGER,
        goals_for INTEGER,
        goals_against INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (team_id) REFERENCES teams(id)
      )
    `);
    console.log('League classification table created');
    
    // Create sessions table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR NOT NULL,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL,
        CONSTRAINT session_pkey PRIMARY KEY (sid)
      )
    `);
    console.log('Sessions table created');
    
    // Create index on session expiration
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire)
    `);
    
    console.log('Database schema initialized successfully!');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the initialization
initDatabase();