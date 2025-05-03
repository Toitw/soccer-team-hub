/**
 * Database Migration Script
 * 
 * This script migrates data from the file-based storage system to PostgreSQL.
 * It reads JSON data from the data directory and inserts it into the appropriate database tables.
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import * as schema from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

// Constants
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TEAMS_FILE = path.join(DATA_DIR, 'teams.json');
const TEAM_MEMBERS_FILE = path.join(DATA_DIR, 'team-members.json');
const MATCHES_FILE = path.join(DATA_DIR, 'matches.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');
const PLAYER_STATS_FILE = path.join(DATA_DIR, 'player-stats.json');
const ANNOUNCEMENTS_FILE = path.join(DATA_DIR, 'announcements.json');
const INVITATIONS_FILE = path.join(DATA_DIR, 'invitations.json');
const MATCH_LINEUPS_FILE = path.join(DATA_DIR, 'match-lineups.json');
const TEAM_LINEUPS_FILE = path.join(DATA_DIR, 'team-lineups.json');
const MATCH_SUBSTITUTIONS_FILE = path.join(DATA_DIR, 'match-substitutions.json');
const MATCH_GOALS_FILE = path.join(DATA_DIR, 'match-goals.json');
const MATCH_CARDS_FILE = path.join(DATA_DIR, 'match-cards.json');
const MATCH_PHOTOS_FILE = path.join(DATA_DIR, 'match-photos.json');
const LEAGUE_CLASSIFICATION_FILE = path.join(DATA_DIR, 'league-classification.json');

// Helper function to read JSON data
function readJsonFile(filePath: string): any[] {
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error);
      return [];
    }
  }
  return [];
}

// Helper function to process date fields in each object
function processDates(obj: any): any {
  const dateFields = [
    'createdAt', 'updatedAt', 'lastLoginAt', 'joinedAt', 'matchDate', 
    'startTime', 'endTime', 'eventDate', 'verificationTokenExpiry', 
    'resetPasswordTokenExpiry', 'expiryDate', 'uploadedAt'
  ];

  for (const key of Object.keys(obj)) {
    if (dateFields.includes(key) && obj[key]) {
      obj[key] = new Date(obj[key]);
    }
  }

  return obj;
}

// Migrate users
async function migrateUsers() {
  const users = readJsonFile(USERS_FILE);
  if (users.length === 0) {
    console.log('No users to migrate');
    return;
  }

  console.log(`Migrating ${users.length} users...`);
  
  try {
    // Check if users already exist to avoid duplicates
    const existingUsers = await db.select({ id: schema.users.id }).from(schema.users);
    const existingIds = new Set(existingUsers.map(u => u.id));
    
    let newCount = 0;
    
    for (const user of users) {
      // Skip users that are already in the database
      if (existingIds.has(user.id)) continue;
      
      // Process dates and insert
      const processedUser = processDates(user);
      await db.insert(schema.users).values(processedUser);
      newCount++;
    }
    
    console.log(`Migrated ${newCount} new users`);
  } catch (error) {
    console.error('Error migrating users:', error);
  }
}

// Migrate teams
async function migrateTeams() {
  const teams = readJsonFile(TEAMS_FILE);
  if (teams.length === 0) {
    console.log('No teams to migrate');
    return;
  }

  console.log(`Migrating ${teams.length} teams...`);
  
  try {
    // Check if teams already exist to avoid duplicates
    const existingTeams = await db.select({ id: schema.teams.id }).from(schema.teams);
    const existingIds = new Set(existingTeams.map(t => t.id));
    
    let newCount = 0;
    
    for (const team of teams) {
      // Skip teams that are already in the database
      if (existingIds.has(team.id)) continue;
      
      // Process dates and insert
      const processedTeam = processDates(team);
      await db.insert(schema.teams).values(processedTeam);
      newCount++;
    }
    
    console.log(`Migrated ${newCount} new teams`);
  } catch (error) {
    console.error('Error migrating teams:', error);
  }
}

// Migrate team members
async function migrateTeamMembers() {
  const members = readJsonFile(TEAM_MEMBERS_FILE);
  if (members.length === 0) {
    console.log('No team members to migrate');
    return;
  }

  console.log(`Migrating ${members.length} team members...`);
  
  try {
    // Check if members already exist to avoid duplicates
    const existingMembers = await db.select({ id: schema.teamMembers.id }).from(schema.teamMembers);
    const existingIds = new Set(existingMembers.map(m => m.id));
    
    let newCount = 0;
    
    for (const member of members) {
      // Skip members that are already in the database
      if (existingIds.has(member.id)) continue;
      
      // Process dates and insert
      const processedMember = processDates(member);
      await db.insert(schema.teamMembers).values(processedMember);
      newCount++;
    }
    
    console.log(`Migrated ${newCount} new team members`);
  } catch (error) {
    console.error('Error migrating team members:', error);
  }
}

// Migrate matches
async function migrateMatches() {
  const matches = readJsonFile(MATCHES_FILE);
  if (matches.length === 0) {
    console.log('No matches to migrate');
    return;
  }

  console.log(`Migrating ${matches.length} matches...`);
  
  try {
    // Check if matches already exist to avoid duplicates
    const existingMatches = await db.select({ id: schema.matches.id }).from(schema.matches);
    const existingIds = new Set(existingMatches.map(m => m.id));
    
    let newCount = 0;
    
    for (const match of matches) {
      // Skip matches that are already in the database
      if (existingIds.has(match.id)) continue;
      
      // Process dates and insert
      const processedMatch = processDates(match);
      await db.insert(schema.matches).values(processedMatch);
      newCount++;
    }
    
    console.log(`Migrated ${newCount} new matches`);
  } catch (error) {
    console.error('Error migrating matches:', error);
  }
}

// Main migration function
async function migrateData() {
  console.log('Starting data migration...');
  
  try {
    // Migrate in order of dependencies
    await migrateUsers();
    await migrateTeams();
    await migrateTeamMembers();
    await migrateMatches();
    
    // TODO: Add more migrations for other entities
    
    console.log('Data migration completed successfully');
  } catch (error) {
    console.error('Data migration failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the migration
migrateData();