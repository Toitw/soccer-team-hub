/**
 * Database Migration Script
 * 
 * This script migrates data from the file-based storage system to PostgreSQL.
 * It reads JSON data from the data directory and inserts it into the appropriate database tables.
 * This version uses the execute() method to run SQL directly for migration, which allows preserving IDs.
 */
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../server/db';
import { pool } from '../server/db';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';

// Constants for data directory and file paths
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
const LEAGUE_CLASSIFICATIONS_FILE = path.join(DATA_DIR, 'league-classifications.json');

// Create backup directory
const BACKUP_DIR = path.join(process.cwd(), 'data-backup', `migration-${Date.now()}`);
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Utility to read JSON files from the data directory
function readJsonFile(filePath: string): any[] {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    // Create a backup
    const fileName = path.basename(filePath);
    fs.writeFileSync(path.join(BACKUP_DIR, fileName), content);
    
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return [];
  }
}

// Process date strings to Date objects
function processDates(obj: any): any {
  const dateFields = [
    'createdAt', 'created_at', 'updatedAt', 'updated_at', 'joinedAt', 'joined_at',
    'matchDate', 'match_date', 'startTime', 'start_time', 'endTime', 'end_time',
    'lastLoginAt', 'last_login_at', 'verificationTokenExpiry', 'verification_token_expiry',
    'resetPasswordTokenExpiry', 'reset_password_token_expiry', 'expiryDate', 'expiry_date',
    'uploadedAt', 'uploaded_at'
  ];

  for (const key in obj) {
    if (typeof obj[key] === 'string' && dateFields.includes(key)) {
      try {
        obj[key] = new Date(obj[key]);
      } catch (e) {
        console.warn(`Failed to parse date ${key}: ${obj[key]}`);
      }
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      obj[key] = processDates(obj[key]);
    }
  }

  return obj;
}

// Helper function to run SQL directly (this preserves IDs)
async function sqlInsert(tableName: string, data: any) {
  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  const columns = Object.keys(data);
  const values = Object.values(data).map(val => {
    if (val === null) return 'NULL';
    if (val instanceof Date) return `'${val.toISOString()}'`;
    if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    return val;
  });

  const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) 
               VALUES (${values.join(', ')})
               ON CONFLICT (id) DO NOTHING
               RETURNING *`;

  try {
    const result = await pool.query(sql);
    return result.rows[0];
  } catch (error) {
    console.error(`Error executing SQL for ${tableName}:`, error);
    return null;
  }
}

// Migrate users
async function migrateUsers() {
  const usersData = readJsonFile(USERS_FILE);
  if (usersData.length === 0) {
    console.log('No users data found, skipping migration');
    return;
  }

  console.log(`Found ${usersData.length} users to migrate`);
  let migratedCount = 0;

  for (const user of usersData) {
    try {
      // Check if user already exists
      const existingUser = await db.select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.username, user.username))
        .limit(1);
      
      if (existingUser.length > 0) {
        console.log(`User ${user.username} already exists, skipping`);
        continue;
      }
      
      // Process dates in user object
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
        bio: processedUser.bio,
        verificationToken: processedUser.verificationToken,
        verificationTokenExpiry: processedUser.verificationTokenExpiry,
        isEmailVerified: processedUser.isEmailVerified || false,
        resetPasswordToken: processedUser.resetPasswordToken,
        resetPasswordTokenExpiry: processedUser.resetPasswordTokenExpiry,
        lastLoginAt: processedUser.lastLoginAt,
        createdAt: processedUser.createdAt || new Date()
      };
      
      await sqlInsert('users', userData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating user ${user.username}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} users successfully`);
}

// Migrate teams
async function migrateTeams() {
  const teamsData = readJsonFile(TEAMS_FILE);
  if (teamsData.length === 0) {
    console.log('No teams data found, skipping migration');
    return;
  }

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
        console.log(`Team ${team.name} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedTeam = processDates(team);
      
      // Insert team with direct SQL
      const teamData = {
        id: processedTeam.id,
        name: processedTeam.name,
        createdById: processedTeam.createdById,
        logo: processedTeam.logo,
        division: processedTeam.division,
        seasonYear: processedTeam.seasonYear,
        joinCode: processedTeam.joinCode
      };
      
      await sqlInsert('teams', teamData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating team ${team.name}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} teams successfully`);
}

// Migrate team members
async function migrateTeamMembers() {
  const teamMembersData = readJsonFile(TEAM_MEMBERS_FILE);
  if (teamMembersData.length === 0) {
    console.log('No team members data found, skipping migration');
    return;
  }

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
  const matchesData = readJsonFile(MATCHES_FILE);
  if (matchesData.length === 0) {
    console.log('No matches data found, skipping migration');
    return;
  }

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
      
      // Insert match with direct SQL (matchType is required, so default to 'friendly')
      const matchData = {
        id: processedMatch.id,
        teamId: processedMatch.teamId,
        opponentName: processedMatch.opponentName,
        opponentLogo: processedMatch.opponentLogo,
        matchDate: processedMatch.matchDate,
        location: processedMatch.location,
        isHome: processedMatch.isHome,
        status: processedMatch.status || 'scheduled',
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
  const eventsData = readJsonFile(EVENTS_FILE);
  if (eventsData.length === 0) {
    console.log('No events data found, skipping migration');
    return;
  }

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
        startTime: processedEvent.startTime,
        endTime: processedEvent.endTime,
        location: processedEvent.location,
        description: processedEvent.description,
        isRequired: processedEvent.isRequired
      };
      
      await sqlInsert('events', eventData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating event ${event.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} events successfully`);
}

// Migrate attendance records
async function migrateAttendances() {
  const attendanceData = readJsonFile(ATTENDANCE_FILE);
  if (attendanceData.length === 0) {
    console.log('No attendance data found, skipping migration');
    return;
  }

  console.log(`Found ${attendanceData.length} attendance records to migrate`);
  let migratedCount = 0;

  for (const record of attendanceData) {
    try {
      // Check if attendance record already exists
      const existingRecord = await db.select({ id: schema.attendance.id })
        .from(schema.attendance)
        .where(eq(schema.attendance.id, record.id))
        .limit(1);
      
      if (existingRecord.length > 0) {
        console.log(`Attendance record ${record.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedRecord = processDates(record);
      
      // Insert attendance record with direct SQL
      const attendanceData = {
        id: processedRecord.id,
        userId: processedRecord.userId,
        eventId: processedRecord.eventId,
        status: processedRecord.status || 'pending'
      };
      
      await sqlInsert('attendance', attendanceData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating attendance record ${record.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} attendance records successfully`);
}

// Migrate player stats
async function migratePlayerStats() {
  const playerStatsData = readJsonFile(PLAYER_STATS_FILE);
  if (playerStatsData.length === 0) {
    console.log('No player stats data found, skipping migration');
    return;
  }

  console.log(`Found ${playerStatsData.length} player stats to migrate`);
  let migratedCount = 0;

  for (const stat of playerStatsData) {
    try {
      // Check if player stat already exists
      const existingStat = await db.select({ id: schema.playerStats.id })
        .from(schema.playerStats)
        .where(eq(schema.playerStats.id, stat.id))
        .limit(1);
      
      if (existingStat.length > 0) {
        console.log(`Player stat ${stat.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedStat = processDates(stat);
      
      // Insert player stat with direct SQL
      const statData = {
        id: processedStat.id,
        userId: processedStat.userId,
        matchId: processedStat.matchId,
        minutesPlayed: processedStat.minutesPlayed,
        goalsScored: processedStat.goalsScored,
        assists: processedStat.assists,
        yellowCards: processedStat.yellowCards,
        redCards: processedStat.redCards,
        rating: processedStat.rating,
        notes: processedStat.notes
      };
      
      await sqlInsert('player_stats', statData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating player stat ${stat.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} player stats successfully`);
}

// Migrate announcements
async function migrateAnnouncements() {
  const announcementsData = readJsonFile(ANNOUNCEMENTS_FILE);
  if (announcementsData.length === 0) {
    console.log('No announcements data found, skipping migration');
    return;
  }

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
  const invitationsData = readJsonFile(INVITATIONS_FILE);
  if (invitationsData.length === 0) {
    console.log('No invitations data found, skipping migration');
    return;
  }

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
        status: processedInvitation.status || 'pending',
        invitedById: processedInvitation.invitedById,
        createdAt: processedInvitation.createdAt || new Date(),
        expiresAt: processedInvitation.expiresAt
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
  const matchLineupsData = readJsonFile(MATCH_LINEUPS_FILE);
  if (matchLineupsData.length === 0) {
    console.log('No match lineups data found, skipping migration');
    return;
  }

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
      
      // Handle arrays and JSON
      const playerIds = Array.isArray(processedLineup.playerIds) ? processedLineup.playerIds : [];
      const benchPlayerIds = Array.isArray(processedLineup.benchPlayerIds) ? processedLineup.benchPlayerIds : null;
      
      // Insert match lineup with direct SQL
      const lineupData = {
        id: processedLineup.id,
        teamId: processedLineup.teamId,
        matchId: processedLineup.matchId,
        formation: processedLineup.formation,
        playerIds: playerIds,
        benchPlayerIds: benchPlayerIds,
        positionMapping: processedLineup.positionMapping || null,
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
  const teamLineupsData = readJsonFile(TEAM_LINEUPS_FILE);
  if (teamLineupsData.length === 0) {
    console.log('No team lineups data found, skipping migration');
    return;
  }

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
        positionMapping: processedLineup.positionMapping || null,
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
  const substitutionsData = readJsonFile(MATCH_SUBSTITUTIONS_FILE);
  if (substitutionsData.length === 0) {
    console.log('No match substitutions data found, skipping migration');
    return;
  }

  console.log(`Found ${substitutionsData.length} match substitutions to migrate`);
  let migratedCount = 0;

  for (const substitution of substitutionsData) {
    try {
      // Check if match substitution already exists
      const existingSubstitution = await db.select({ id: schema.matchSubstitutions.id })
        .from(schema.matchSubstitutions)
        .where(eq(schema.matchSubstitutions.id, substitution.id))
        .limit(1);
      
      if (existingSubstitution.length > 0) {
        console.log(`Match substitution ${substitution.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedSubstitution = processDates(substitution);
      
      // Insert match substitution with direct SQL
      const substitutionData = {
        id: processedSubstitution.id,
        matchId: processedSubstitution.matchId,
        playerOutId: processedSubstitution.playerOutId,
        playerInId: processedSubstitution.playerInId,
        minute: processedSubstitution.minute,
        reason: processedSubstitution.reason
      };
      
      await sqlInsert('match_substitutions', substitutionData);
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating match substitution ${substitution.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} match substitutions successfully`);
}

// Migrate match goals
async function migrateMatchGoals() {
  const goalsData = readJsonFile(MATCH_GOALS_FILE);
  if (goalsData.length === 0) {
    console.log('No match goals data found, skipping migration');
    return;
  }

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
        type: processedGoal.type || 'regular',
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
  const cardsData = readJsonFile(MATCH_CARDS_FILE);
  if (cardsData.length === 0) {
    console.log('No match cards data found, skipping migration');
    return;
  }

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
        minute: processedCard.minute,
        type: processedCard.type,
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
  const photosData = readJsonFile(MATCH_PHOTOS_FILE);
  if (photosData.length === 0) {
    console.log('No match photos data found, skipping migration');
    return;
  }

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
  const classificationsData = readJsonFile(LEAGUE_CLASSIFICATIONS_FILE);
  if (classificationsData.length === 0) {
    console.log('No league classifications data found, skipping migration');
    return;
  }

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