/**
 * Database Migration Script
 * 
 * This script migrates data from the file-based storage system to PostgreSQL.
 * It reads JSON data from the data directory and inserts it into the appropriate database tables.
 * This version uses the execute() method to run SQL directly for migration, which allows preserving IDs.
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import * as schema from '../shared/schema';
import ws from 'ws';

// Configure Neon client with WebSocket support for Replit
neonConfig.webSocketConstructor = ws;

// Path to data backup directory
const BACKUP_DIR = `data-backup/pre-migration_${new Date().toISOString().replace(/[:.]/g, '-')}`;

// Create database connection
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// Function to read JSON files from the data directory
function readJsonFile(filePath: string): any[] {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return [];
  }
}

// Function to process date strings into Date objects
function processDates(obj: any): any {
  if (!obj) return obj;
  
  const newObj = { ...obj };
  
  const dateFields = [
    'createdAt', 'updatedAt', 'matchDate', 'startTime', 'endTime', 
    'verificationTokenExpiry', 'resetPasswordTokenExpiry', 'joinedAt',
    'lastLoginAt', 'uploadedAt'
  ];
  
  for (const key of Object.keys(newObj)) {
    if (dateFields.includes(key) && typeof newObj[key] === 'string') {
      newObj[key] = new Date(newObj[key]);
    } else if (typeof newObj[key] === 'object' && newObj[key] !== null) {
      newObj[key] = processDates(newObj[key]);
    }
  }
  
  return newObj;
}

// Function to insert data using raw SQL
async function sqlInsert(tableName: string, data: any) {
  const columns = Object.keys(data).join(', ');
  const valuePlaceholders = Object.keys(data).map((_, i) => `$${i + 1}`).join(', ');
  const values = Object.values(data);

  const query = `INSERT INTO ${tableName} (${columns}) VALUES (${valuePlaceholders}) ON CONFLICT (id) DO NOTHING RETURNING id`;
  
  try {
    const result = await pool.query(query, values);
    return result.rows[0]?.id;
  } catch (error) {
    console.error(`Error inserting into ${tableName}:`, error);
    throw error;
  }
}

// Migrate users
async function migrateUsers() {
  const usersData = readJsonFile('data/users.json');
  console.log(`Found ${usersData.length} users to migrate`);
  
  let migratedCount = 0;
  
  for (const user of usersData) {
    try {
      // Check if user already exists
      const existingUser = await db.select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1);
      
      if (existingUser.length > 0) {
        console.log(`User ${user.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedUser = processDates(user);
      
      // Insert user with direct SQL
      const userData = {
        id: processedUser.id,
        username: processedUser.username,
        password: processedUser.password,
        fullName: processedUser.fullName,
        role: processedUser.role,
        profilePicture: processedUser.profilePicture,
        position: processedUser.position,
        jerseyNumber: processedUser.jerseyNumber,
        email: processedUser.email,
        phoneNumber: processedUser.phoneNumber,
        verificationToken: processedUser.verificationToken,
        verificationTokenExpiry: processedUser.verificationTokenExpiry,
        verified: processedUser.verified || false,
        resetPasswordToken: processedUser.resetPasswordToken,
        resetPasswordTokenExpiry: processedUser.resetPasswordTokenExpiry,
        lastLoginAt: processedUser.lastLoginAt || null
      };
      
      await sqlInsert('users', userData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating user ${user.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} users successfully`);
}

// Migrate teams
async function migrateTeams() {
  const teamsData = readJsonFile('data/teams.json');
  console.log(`Found ${teamsData.length} teams to migrate`);
  
  let migratedCount = 0;
  
  for (const team of teamsData) {
    try {
      // Check if team already exists
      const existingTeam = await db.select({ id: schema.teams.id })
        .from(schema.teams)
        .where(eq(schema.teams.id, team.id))
        .limit(1);
      
      if (existingTeam.length > 0) {
        console.log(`Team ${team.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedTeam = processDates(team);
      
      // Insert team with direct SQL
      const teamData = {
        id: processedTeam.id,
        name: processedTeam.name,
        logo: processedTeam.logo,
        createdById: processedTeam.createdById,
        division: processedTeam.division,
        seasonYear: processedTeam.seasonYear,
        joinCode: processedTeam.joinCode
      };
      
      await sqlInsert('teams', teamData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating team ${team.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} teams successfully`);
}

// Migrate team members
async function migrateTeamMembers() {
  const teamMembersData = readJsonFile('data/team_members.json');
  console.log(`Found ${teamMembersData.length} team members to migrate`);
  
  let migratedCount = 0;
  
  for (const member of teamMembersData) {
    try {
      // Check if team member already exists
      const existingMember = await db.select({ id: schema.teamMembers.id })
        .from(schema.teamMembers)
        .where(eq(schema.teamMembers.id, member.id))
        .limit(1);
      
      if (existingMember.length > 0) {
        console.log(`Team member ${member.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedMember = processDates(member);
      
      // Insert team member with direct SQL
      const memberData = {
        id: processedMember.id,
        teamId: processedMember.teamId,
        userId: processedMember.userId,
        role: processedMember.role || 'player',
        joinedAt: processedMember.joinedAt || new Date()
      };
      
      await sqlInsert('team_members', memberData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating team member ${member.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} team members successfully`);
}

// Migrate matches
async function migrateMatches() {
  const matchesData = readJsonFile('data/matches.json');
  console.log(`Found ${matchesData.length} matches to migrate`);
  
  let migratedCount = 0;
  
  for (const match of matchesData) {
    try {
      // Check if match already exists
      const existingMatch = await db.select({ id: schema.matches.id })
        .from(schema.matches)
        .where(eq(schema.matches.id, match.id))
        .limit(1);
      
      if (existingMatch.length > 0) {
        console.log(`Match ${match.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedMatch = processDates(match);
      
      // Insert match with direct SQL
      const matchData = {
        id: processedMatch.id,
        teamId: processedMatch.teamId,
        opponentName: processedMatch.opponentName,
        opponentLogo: processedMatch.opponentLogo,
        matchDate: processedMatch.matchDate,
        location: processedMatch.location,
        isHome: processedMatch.isHome,
        status: processedMatch.status,
        goalsScored: processedMatch.goalsScored,
        goalsConceded: processedMatch.goalsConceded,
        matchType: processedMatch.matchType || 'friendly',
        notes: processedMatch.notes
      };
      
      await sqlInsert('matches', matchData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating match ${match.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} matches successfully`);
}

// Migrate events
async function migrateEvents() {
  const eventsData = readJsonFile('data/events.json');
  console.log(`Found ${eventsData.length} events to migrate`);
  
  let migratedCount = 0;
  
  for (const event of eventsData) {
    try {
      // Check if event already exists
      const existingEvent = await db.select({ id: schema.events.id })
        .from(schema.events)
        .where(eq(schema.events.id, event.id))
        .limit(1);
      
      if (existingEvent.length > 0) {
        console.log(`Event ${event.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedEvent = processDates(event);
      
      // Insert event with direct SQL
      const eventData = {
        id: processedEvent.id,
        teamId: processedEvent.teamId,
        type: processedEvent.type,
        title: processedEvent.title,
        description: processedEvent.description,
        location: processedEvent.location,
        startTime: processedEvent.startTime,
        endTime: processedEvent.endTime,
        createdById: processedEvent.createdById
      };
      
      await sqlInsert('events', eventData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating event ${event.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} events successfully`);
}

// Migrate attendances
async function migrateAttendances() {
  const attendancesData = readJsonFile('data/attendances.json');
  console.log(`Found ${attendancesData.length} attendances to migrate`);
  
  let migratedCount = 0;
  
  for (const attendance of attendancesData) {
    try {
      // Check if attendance already exists
      const existingAttendance = await db.select({ id: schema.attendances.id })
        .from(schema.attendances)
        .where(eq(schema.attendances.id, attendance.id))
        .limit(1);
      
      if (existingAttendance.length > 0) {
        console.log(`Attendance ${attendance.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedAttendance = processDates(attendance);
      
      // Insert attendance with direct SQL
      const attendanceData = {
        id: processedAttendance.id,
        userId: processedAttendance.userId,
        eventId: processedAttendance.eventId,
        status: processedAttendance.status
      };
      
      await sqlInsert('attendances', attendanceData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating attendance ${attendance.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} attendances successfully`);
}

// Migrate player stats
async function migratePlayerStats() {
  const playerStatsData = readJsonFile('data/player_stats.json');
  console.log(`Found ${playerStatsData.length} player stats to migrate`);
  
  let migratedCount = 0;
  
  for (const stats of playerStatsData) {
    try {
      // Check if player stats already exists
      const existingStats = await db.select({ id: schema.playerStats.id })
        .from(schema.playerStats)
        .where(eq(schema.playerStats.id, stats.id))
        .limit(1);
      
      if (existingStats.length > 0) {
        console.log(`Player stats ${stats.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedStats = processDates(stats);
      
      // Insert player stats with direct SQL
      const statsData = {
        id: processedStats.id,
        userId: processedStats.userId,
        teamId: processedStats.teamId,
        gamesPlayed: processedStats.gamesPlayed,
        goalsScored: processedStats.goalsScored,
        assists: processedStats.assists,
        yellowCards: processedStats.yellowCards,
        redCards: processedStats.redCards,
        minutesPlayed: processedStats.minutesPlayed,
        seasonYear: processedStats.seasonYear
      };
      
      await sqlInsert('player_stats', statsData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating player stats ${stats.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} player stats successfully`);
}

// Migrate announcements
async function migrateAnnouncements() {
  const announcementsData = readJsonFile('data/announcements.json');
  console.log(`Found ${announcementsData.length} announcements to migrate`);
  
  let migratedCount = 0;
  
  for (const announcement of announcementsData) {
    try {
      // Check if announcement already exists
      const existingAnnouncement = await db.select({ id: schema.announcements.id })
        .from(schema.announcements)
        .where(eq(schema.announcements.id, announcement.id))
        .limit(1);
      
      if (existingAnnouncement.length > 0) {
        console.log(`Announcement ${announcement.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedAnnouncement = processDates(announcement);
      
      // Insert announcement with direct SQL
      const announcementData = {
        id: processedAnnouncement.id,
        teamId: processedAnnouncement.teamId,
        createdById: processedAnnouncement.createdById,
        title: processedAnnouncement.title,
        content: processedAnnouncement.content,
        createdAt: processedAnnouncement.createdAt || new Date()
      };
      
      await sqlInsert('announcements', announcementData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating announcement ${announcement.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} announcements successfully`);
}

// Migrate invitations
async function migrateInvitations() {
  const invitationsData = readJsonFile('data/invitations.json');
  console.log(`Found ${invitationsData.length} invitations to migrate`);
  
  let migratedCount = 0;
  
  for (const invitation of invitationsData) {
    try {
      // Check if invitation already exists
      const existingInvitation = await db.select({ id: schema.invitations.id })
        .from(schema.invitations)
        .where(eq(schema.invitations.id, invitation.id))
        .limit(1);
      
      if (existingInvitation.length > 0) {
        console.log(`Invitation ${invitation.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedInvitation = processDates(invitation);
      
      // Insert invitation with direct SQL
      const invitationData = {
        id: processedInvitation.id,
        teamId: processedInvitation.teamId,
        email: processedInvitation.email,
        token: processedInvitation.token,
        role: processedInvitation.role || 'player',
        createdAt: processedInvitation.createdAt || new Date(),
        expiresAt: processedInvitation.expiresAt,
        status: processedInvitation.status
      };
      
      await sqlInsert('invitations', invitationData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating invitation ${invitation.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} invitations successfully`);
}

// Migrate match lineups
async function migrateMatchLineups() {
  const matchLineupsData = readJsonFile('data/match_lineups.json');
  console.log(`Found ${matchLineupsData.length} match lineups to migrate`);
  
  let migratedCount = 0;
  
  for (const lineup of matchLineupsData) {
    try {
      // Check if match lineup already exists
      const existingLineup = await db.select({ id: schema.matchLineups.id })
        .from(schema.matchLineups)
        .where(eq(schema.matchLineups.id, lineup.id))
        .limit(1);
      
      if (existingLineup.length > 0) {
        console.log(`Match lineup ${lineup.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedLineup = processDates(lineup);
      
      // Insert match lineup with direct SQL
      const lineupData = {
        id: processedLineup.id,
        matchId: processedLineup.matchId,
        teamId: processedLineup.teamId,
        playerIds: JSON.stringify(processedLineup.playerIds),
        benchPlayerIds: processedLineup.benchPlayerIds ? JSON.stringify(processedLineup.benchPlayerIds) : null,
        formation: processedLineup.formation,
        positionMapping: processedLineup.positionMapping ? JSON.stringify(processedLineup.positionMapping) : null,
        createdAt: processedLineup.createdAt || new Date()
      };
      
      await sqlInsert('match_lineups', lineupData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating match lineup ${lineup.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} match lineups successfully`);
}

// Migrate team lineups
async function migrateTeamLineups() {
  const teamLineupsData = readJsonFile('data/team_lineups.json');
  console.log(`Found ${teamLineupsData.length} team lineups to migrate`);
  
  let migratedCount = 0;
  
  for (const lineup of teamLineupsData) {
    try {
      // Check if team lineup already exists
      const existingLineup = await db.select({ id: schema.teamLineups.id })
        .from(schema.teamLineups)
        .where(eq(schema.teamLineups.id, lineup.id))
        .limit(1);
      
      if (existingLineup.length > 0) {
        console.log(`Team lineup ${lineup.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedLineup = processDates(lineup);
      
      // Insert team lineup with direct SQL
      const lineupData = {
        id: processedLineup.id,
        teamId: processedLineup.teamId,
        formation: processedLineup.formation,
        positionMapping: processedLineup.positionMapping ? JSON.stringify(processedLineup.positionMapping) : null,
        createdAt: processedLineup.createdAt || new Date(),
        updatedAt: processedLineup.updatedAt || new Date()
      };
      
      await sqlInsert('team_lineups', lineupData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating team lineup ${lineup.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} team lineups successfully`);
}

// Migrate match substitutions
async function migrateMatchSubstitutions() {
  const substitutionsData = readJsonFile('data/match_substitutions.json');
  console.log(`Found ${substitutionsData.length} match substitutions to migrate`);
  
  let migratedCount = 0;
  
  for (const sub of substitutionsData) {
    try {
      // Check if match substitution already exists
      const existingSub = await db.select({ id: schema.matchSubstitutions.id })
        .from(schema.matchSubstitutions)
        .where(eq(schema.matchSubstitutions.id, sub.id))
        .limit(1);
      
      if (existingSub.length > 0) {
        console.log(`Match substitution ${sub.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedSub = processDates(sub);
      
      // Insert match substitution with direct SQL
      const subData = {
        id: processedSub.id,
        matchId: processedSub.matchId,
        playerInId: processedSub.playerInId,
        playerOutId: processedSub.playerOutId,
        minute: processedSub.minute,
        reason: processedSub.reason
      };
      
      await sqlInsert('match_substitutions', subData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating match substitution ${sub.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} match substitutions successfully`);
}

// Migrate match goals
async function migrateMatchGoals() {
  const goalsData = readJsonFile('data/match_goals.json');
  console.log(`Found ${goalsData.length} match goals to migrate`);
  
  let migratedCount = 0;
  
  for (const goal of goalsData) {
    try {
      // Check if match goal already exists
      const existingGoal = await db.select({ id: schema.matchGoals.id })
        .from(schema.matchGoals)
        .where(eq(schema.matchGoals.id, goal.id))
        .limit(1);
      
      if (existingGoal.length > 0) {
        console.log(`Match goal ${goal.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedGoal = processDates(goal);
      
      // Insert match goal with direct SQL
      const goalData = {
        id: processedGoal.id,
        matchId: processedGoal.matchId,
        scorerId: processedGoal.scorerId,
        assistId: processedGoal.assistId,
        minute: processedGoal.minute,
        isOwnGoal: processedGoal.isOwnGoal || false,
        isPenalty: processedGoal.isPenalty || false,
        description: processedGoal.description
      };
      
      await sqlInsert('match_goals', goalData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating match goal ${goal.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} match goals successfully`);
}

// Migrate match cards
async function migrateMatchCards() {
  const cardsData = readJsonFile('data/match_cards.json');
  console.log(`Found ${cardsData.length} match cards to migrate`);
  
  let migratedCount = 0;
  
  for (const card of cardsData) {
    try {
      // Check if match card already exists
      const existingCard = await db.select({ id: schema.matchCards.id })
        .from(schema.matchCards)
        .where(eq(schema.matchCards.id, card.id))
        .limit(1);
      
      if (existingCard.length > 0) {
        console.log(`Match card ${card.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedCard = processDates(card);
      
      // Insert match card with direct SQL
      const cardData = {
        id: processedCard.id,
        matchId: processedCard.matchId,
        playerId: processedCard.playerId,
        type: processedCard.type,
        minute: processedCard.minute,
        reason: processedCard.reason
      };
      
      await sqlInsert('match_cards', cardData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating match card ${card.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} match cards successfully`);
}

// Migrate match photos
async function migrateMatchPhotos() {
  const photosData = readJsonFile('data/match_photos.json');
  console.log(`Found ${photosData.length} match photos to migrate`);
  
  let migratedCount = 0;
  
  for (const photo of photosData) {
    try {
      // Check if match photo already exists
      const existingPhoto = await db.select({ id: schema.matchPhotos.id })
        .from(schema.matchPhotos)
        .where(eq(schema.matchPhotos.id, photo.id))
        .limit(1);
      
      if (existingPhoto.length > 0) {
        console.log(`Match photo ${photo.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedPhoto = processDates(photo);
      
      // Insert match photo with direct SQL
      const photoData = {
        id: processedPhoto.id,
        matchId: processedPhoto.matchId,
        url: processedPhoto.url,
        caption: processedPhoto.caption,
        uploadedById: processedPhoto.uploadedById,
        uploadedAt: processedPhoto.uploadedAt || new Date()
      };
      
      await sqlInsert('match_photos', photoData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating match photo ${photo.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} match photos successfully`);
}

// Migrate league classifications
async function migrateLeagueClassifications() {
  const classificationsData = readJsonFile('data/league_classifications.json');
  console.log(`Found ${classificationsData.length} league classifications to migrate`);
  
  let migratedCount = 0;
  
  for (const classification of classificationsData) {
    try {
      // Check if league classification already exists
      const existingClassification = await db.select({ id: schema.leagueClassification.id })
        .from(schema.leagueClassification)
        .where(eq(schema.leagueClassification.id, classification.id))
        .limit(1);
      
      if (existingClassification.length > 0) {
        console.log(`League classification ${classification.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedClassification = processDates(classification);
      
      // Insert league classification with direct SQL
      const classificationData = {
        id: processedClassification.id,
        teamId: processedClassification.teamId,
        externalTeamName: processedClassification.externalTeamName,
        position: processedClassification.position,
        points: processedClassification.points || 0,
        gamesPlayed: processedClassification.gamesPlayed,
        gamesWon: processedClassification.gamesWon,
        gamesDrawn: processedClassification.gamesDrawn,
        gamesLost: processedClassification.gamesLost,
        goalsFor: processedClassification.goalsFor,
        goalsAgainst: processedClassification.goalsAgainst,
        createdAt: processedClassification.createdAt || new Date(),
        updatedAt: processedClassification.updatedAt || new Date()
      };
      
      await sqlInsert('league_classification', classificationData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating league classification ${classification.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} league classifications successfully`);
}

// Main migration function
async function migrateData() {
  console.log('Starting data migration to PostgreSQL...');
  console.log(`Creating backup in: ${BACKUP_DIR}`);
  
  try {
    // Migrate users first (as they are referenced by other tables)
    await migrateUsers();
    
    // Migrate teams (referenced by many other tables)
    await migrateTeams();
    
    // Migrate team members
    await migrateTeamMembers();
    
    // Migrate matches
    await migrateMatches();
    
    // Migrate events
    await migrateEvents();
    
    // Migrate attendances
    await migrateAttendances();
    
    // Migrate player stats
    await migratePlayerStats();
    
    // Migrate announcements
    await migrateAnnouncements();
    
    // Migrate invitations
    await migrateInvitations();
    
    // Migrate match lineups
    await migrateMatchLineups();
    
    // Migrate team lineups
    await migrateTeamLineups();
    
    // Migrate match substitutions
    await migrateMatchSubstitutions();
    
    // Migrate match goals
    await migrateMatchGoals();
    
    // Migrate match cards
    await migrateMatchCards();
    
    // Migrate match photos
    await migrateMatchPhotos();
    
    // Migrate league classifications
    await migrateLeagueClassifications();
    
    console.log('Data migration completed successfully!');
    console.log(`Data backed up to: ${BACKUP_DIR}`);
  } catch (error) {
    console.error('Error during data migration:', error);
    process.exit(1);
  }
  
  // Close the pool connection
  await pool.end();
  process.exit(0);
}

// Run the migration
migrateData();