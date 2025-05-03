/**
 * Database Migration Script using Direct SQL
 * 
 * This script migrates data from the file-based storage system to PostgreSQL
 * using direct SQL statements, avoiding potential TypeScript issues.
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import ws from 'ws';

// Configure Neon client with WebSocket support for Replit
neonConfig.webSocketConstructor = ws;

// Path to data backup directory
const BACKUP_DIR = `data-backup/pre-migration_${new Date().toISOString().replace(/[:.]/g, '-')}`;

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Create database connection
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
    'lastLoginAt', 'uploadedAt', 'expiresAt'
  ];
  
  for (const key of Object.keys(newObj)) {
    if (dateFields.includes(key) && typeof newObj[key] === 'string') {
      newObj[key] = new Date(newObj[key]);
    } else if (Array.isArray(newObj[key])) {
      newObj[key] = newObj[key].map((item: any) => 
        typeof item === 'object' && item !== null ? processDates(item) : item
      );
    } else if (typeof newObj[key] === 'object' && newObj[key] !== null) {
      newObj[key] = processDates(newObj[key]);
    }
  }
  
  return newObj;
}

// Function to format a value for SQL
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  
  if (typeof value === 'number') {
    return value.toString();
  }
  
  if (Array.isArray(value) || typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  
  return `'${value.toString().replace(/'/g, "''")}'`;
}

// Function to insert data using raw SQL
async function directInsert(tableName: string, data: any) {
  const columns = Object.keys(data).join(', ');
  const values = Object.values(data).map(formatValue).join(', ');

  const query = `INSERT INTO ${tableName} (${columns}) VALUES (${values}) ON CONFLICT (id) DO NOTHING RETURNING id`;
  
  try {
    const result = await pool.query(query);
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
      const existingUserResult = await pool.query(
        'SELECT id FROM users WHERE id = $1 LIMIT 1',
        [user.id]
      );
      
      if (existingUserResult.rows.length > 0) {
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
        full_name: processedUser.fullName,
        role: processedUser.role,
        profile_picture: processedUser.profilePicture,
        position: processedUser.position,
        jersey_number: processedUser.jerseyNumber,
        email: processedUser.email,
        phone_number: processedUser.phoneNumber,
        verification_token: processedUser.verificationToken,
        verification_token_expiry: processedUser.verificationTokenExpiry,
        is_email_verified: processedUser.verified || false,
        reset_password_token: processedUser.resetPasswordToken,
        reset_password_token_expiry: processedUser.resetPasswordTokenExpiry,
        last_login_at: processedUser.lastLoginAt || null,
        created_at: processedUser.createdAt || new Date()
      };
      
      await directInsert('users', userData);
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
      const existingTeamResult = await pool.query(
        'SELECT id FROM teams WHERE id = $1 LIMIT 1',
        [team.id]
      );
      
      if (existingTeamResult.rows.length > 0) {
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
        created_by_id: processedTeam.createdById,
        division: processedTeam.division,
        season_year: processedTeam.seasonYear,
        join_code: processedTeam.joinCode,
        created_at: processedTeam.createdAt || new Date(),
        updated_at: processedTeam.updatedAt || new Date()
      };
      
      await directInsert('teams', teamData);
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
      const existingMemberResult = await pool.query(
        'SELECT id FROM team_members WHERE id = $1 LIMIT 1',
        [member.id]
      );
      
      if (existingMemberResult.rows.length > 0) {
        console.log(`Team member ${member.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedMember = processDates(member);
      
      // Insert team member with direct SQL
      const memberData = {
        id: processedMember.id,
        team_id: processedMember.teamId,
        user_id: processedMember.userId,
        role: processedMember.role || 'player',
        joined_at: processedMember.joinedAt || new Date(),
        is_active: processedMember.isActive !== undefined ? processedMember.isActive : true
      };
      
      await directInsert('team_members', memberData);
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
      const existingMatchResult = await pool.query(
        'SELECT id FROM matches WHERE id = $1 LIMIT 1',
        [match.id]
      );
      
      if (existingMatchResult.rows.length > 0) {
        console.log(`Match ${match.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedMatch = processDates(match);
      
      // Insert match with direct SQL
      const matchData = {
        id: processedMatch.id,
        team_id: processedMatch.teamId,
        opponent_name: processedMatch.opponentName,
        opponent_logo: processedMatch.opponentLogo,
        match_date: processedMatch.matchDate,
        location: processedMatch.location,
        is_home: processedMatch.isHome,
        status: processedMatch.status,
        goals_scored: processedMatch.goalsScored,
        goals_conceded: processedMatch.goalsConceded,
        match_type: processedMatch.matchType || 'friendly',
        notes: processedMatch.notes
      };
      
      await directInsert('matches', matchData);
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
      const existingEventResult = await pool.query(
        'SELECT id FROM events WHERE id = $1 LIMIT 1',
        [event.id]
      );
      
      if (existingEventResult.rows.length > 0) {
        console.log(`Event ${event.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedEvent = processDates(event);
      
      // Insert event with direct SQL
      const eventData = {
        id: processedEvent.id,
        team_id: processedEvent.teamId,
        event_type: processedEvent.type,
        title: processedEvent.title,
        description: processedEvent.description,
        location: processedEvent.location,
        start_time: processedEvent.startTime,
        end_time: processedEvent.endTime,
        created_by_id: processedEvent.createdById,
        created_at: processedEvent.createdAt || new Date()
      };
      
      await directInsert('events', eventData);
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
      const existingAttendanceResult = await pool.query(
        'SELECT id FROM attendance WHERE id = $1 LIMIT 1',
        [attendance.id]
      );
      
      if (existingAttendanceResult.rows.length > 0) {
        console.log(`Attendance ${attendance.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedAttendance = processDates(attendance);
      
      // Insert attendance with direct SQL
      const attendanceData = {
        id: processedAttendance.id,
        user_id: processedAttendance.userId,
        event_id: processedAttendance.eventId,
        status: processedAttendance.status,
        notes: processedAttendance.notes || null,
        created_at: processedAttendance.createdAt || new Date(),
        updated_at: processedAttendance.updatedAt || new Date()
      };
      
      await directInsert('attendance', attendanceData);
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
      const existingStatsResult = await pool.query(
        'SELECT id FROM player_stats WHERE id = $1 LIMIT 1',
        [stats.id]
      );
      
      if (existingStatsResult.rows.length > 0) {
        console.log(`Player stats ${stats.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedStats = processDates(stats);
      
      // Insert player stats with direct SQL
      const statsData = {
        id: processedStats.id,
        user_id: processedStats.userId,
        team_id: processedStats.teamId,
        match_id: processedStats.matchId || null,
        minutes_played: processedStats.minutesPlayed || null,
        goals: processedStats.goalsScored || null,
        assists: processedStats.assists || null,
        yellow_cards: processedStats.yellowCards || null,
        red_cards: processedStats.redCards || null,
        rating: processedStats.rating || null,
        notes: processedStats.notes || null,
        created_at: processedStats.createdAt || new Date()
      };
      
      await directInsert('player_stats', statsData);
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
      const existingAnnouncementResult = await pool.query(
        'SELECT id FROM announcements WHERE id = $1 LIMIT 1',
        [announcement.id]
      );
      
      if (existingAnnouncementResult.rows.length > 0) {
        console.log(`Announcement ${announcement.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedAnnouncement = processDates(announcement);
      
      // Insert announcement with direct SQL
      const announcementData = {
        id: processedAnnouncement.id,
        team_id: processedAnnouncement.teamId,
        created_by_id: processedAnnouncement.createdById,
        title: processedAnnouncement.title,
        content: processedAnnouncement.content,
        created_at: processedAnnouncement.createdAt || new Date()
      };
      
      await directInsert('announcements', announcementData);
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
      const existingInvitationResult = await pool.query(
        'SELECT id FROM invitations WHERE id = $1 LIMIT 1',
        [invitation.id]
      );
      
      if (existingInvitationResult.rows.length > 0) {
        console.log(`Invitation ${invitation.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedInvitation = processDates(invitation);
      
      // Insert invitation with direct SQL
      const invitationData = {
        id: processedInvitation.id,
        team_id: processedInvitation.teamId,
        email: processedInvitation.email,
        token: processedInvitation.token,
        role: processedInvitation.role || 'player',
        created_at: processedInvitation.createdAt || new Date(),
        expires_at: processedInvitation.expiresAt,
        created_by_id: processedInvitation.createdById || 1,
        is_accepted: processedInvitation.isAccepted || false,
        accepted_at: processedInvitation.acceptedAt || null
      };
      
      await directInsert('invitations', invitationData);
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
      const existingLineupResult = await pool.query(
        'SELECT id FROM match_lineups WHERE id = $1 LIMIT 1',
        [lineup.id]
      );
      
      if (existingLineupResult.rows.length > 0) {
        console.log(`Match lineup ${lineup.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedLineup = processDates(lineup);
      
      // Convert arrays to JSON for storage
      const playerIdsString = JSON.stringify(processedLineup.playerIds || []);
      const benchPlayerIdsString = processedLineup.benchPlayerIds 
        ? JSON.stringify(processedLineup.benchPlayerIds) 
        : null;
      const positionMappingString = processedLineup.positionMapping 
        ? JSON.stringify(processedLineup.positionMapping) 
        : null;
      
      // Insert match lineup with direct SQL
      const lineupData = {
        id: processedLineup.id,
        match_id: processedLineup.matchId,
        team_id: processedLineup.teamId,
        player_ids: playerIdsString,
        bench_player_ids: benchPlayerIdsString,
        formation: processedLineup.formation,
        position_mapping: positionMappingString,
        created_at: processedLineup.createdAt || new Date()
      };
      
      await directInsert('match_lineups', lineupData);
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
      const existingLineupResult = await pool.query(
        'SELECT id FROM team_lineups WHERE id = $1 LIMIT 1',
        [lineup.id]
      );
      
      if (existingLineupResult.rows.length > 0) {
        console.log(`Team lineup ${lineup.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedLineup = processDates(lineup);
      
      // Convert position mapping to JSON for storage
      const positionMappingString = processedLineup.positionMapping 
        ? JSON.stringify(processedLineup.positionMapping) 
        : null;
      
      // Insert team lineup with direct SQL
      const lineupData = {
        id: processedLineup.id,
        team_id: processedLineup.teamId,
        formation: processedLineup.formation,
        position_mapping: positionMappingString,
        created_at: processedLineup.createdAt || new Date(),
        updated_at: processedLineup.updatedAt || new Date()
      };
      
      await directInsert('team_lineups', lineupData);
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
      const existingSubResult = await pool.query(
        'SELECT id FROM match_substitutions WHERE id = $1 LIMIT 1',
        [sub.id]
      );
      
      if (existingSubResult.rows.length > 0) {
        console.log(`Match substitution ${sub.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedSub = processDates(sub);
      
      // Insert match substitution with direct SQL
      const subData = {
        id: processedSub.id,
        match_id: processedSub.matchId,
        player_in_id: processedSub.playerInId,
        player_out_id: processedSub.playerOutId,
        minute: processedSub.minute,
        created_at: processedSub.createdAt || new Date()
      };
      
      await directInsert('match_substitutions', subData);
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
      const existingGoalResult = await pool.query(
        'SELECT id FROM match_goals WHERE id = $1 LIMIT 1',
        [goal.id]
      );
      
      if (existingGoalResult.rows.length > 0) {
        console.log(`Match goal ${goal.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedGoal = processDates(goal);
      
      // Insert match goal with direct SQL
      const goalData = {
        id: processedGoal.id,
        match_id: processedGoal.matchId,
        scorer_id: processedGoal.scorerId,
        assist_id: processedGoal.assistId,
        minute: processedGoal.minute,
        is_own_goal: processedGoal.isOwnGoal || false,
        is_penalty: processedGoal.isPenalty || false,
        created_at: processedGoal.createdAt || new Date()
      };
      
      await directInsert('match_goals', goalData);
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
      const existingCardResult = await pool.query(
        'SELECT id FROM match_cards WHERE id = $1 LIMIT 1',
        [card.id]
      );
      
      if (existingCardResult.rows.length > 0) {
        console.log(`Match card ${card.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedCard = processDates(card);
      
      // Insert match card with direct SQL
      // Convert the card type to boolean flags
      const isYellow = processedCard.type === 'yellow';
      const isSecondYellow = processedCard.type === 'second_yellow';
      
      const cardData = {
        id: processedCard.id,
        match_id: processedCard.matchId,
        player_id: processedCard.playerId,
        minute: processedCard.minute,
        is_yellow: isYellow,
        is_second_yellow: isSecondYellow,
        created_at: processedCard.createdAt || new Date()
      };
      
      await directInsert('match_cards', cardData);
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
      const existingPhotoResult = await pool.query(
        'SELECT id FROM match_photos WHERE id = $1 LIMIT 1',
        [photo.id]
      );
      
      if (existingPhotoResult.rows.length > 0) {
        console.log(`Match photo ${photo.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedPhoto = processDates(photo);
      
      // Insert match photo with direct SQL
      const photoData = {
        id: processedPhoto.id,
        match_id: processedPhoto.matchId,
        url: processedPhoto.url,
        caption: processedPhoto.caption,
        uploader_id: processedPhoto.uploadedById,
        created_at: processedPhoto.uploadedAt || new Date()
      };
      
      await directInsert('match_photos', photoData);
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
      const existingClassificationResult = await pool.query(
        'SELECT id FROM league_classification WHERE id = $1 LIMIT 1',
        [classification.id]
      );
      
      if (existingClassificationResult.rows.length > 0) {
        console.log(`League classification ${classification.id} already exists, skipping`);
        continue;
      }
      
      // Process dates
      const processedClassification = processDates(classification);
      
      // Insert league classification with direct SQL
      const classificationData = {
        id: processedClassification.id,
        team_id: processedClassification.teamId,
        external_team_name: processedClassification.externalTeamName,
        position: processedClassification.position,
        points: processedClassification.points || 0,
        games_played: processedClassification.gamesPlayed,
        games_won: processedClassification.gamesWon,
        games_drawn: processedClassification.gamesDrawn,
        games_lost: processedClassification.gamesLost,
        goals_for: processedClassification.goalsFor,
        goals_against: processedClassification.goalsAgainst,
        created_at: processedClassification.createdAt || new Date(),
        updated_at: processedClassification.updatedAt || new Date()
      };
      
      await directInsert('league_classification', classificationData);
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