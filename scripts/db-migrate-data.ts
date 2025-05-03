/**
 * Database Migration Script
 * 
 * This script migrates data from the file-based storage system to PostgreSQL.
 * It reads JSON data from the data directory and inserts it into the appropriate database tables.
 */
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../server/db';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';

// Utility to read JSON files from the data directory
function readJsonFile(filePath: string): any[] {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
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
    'resetPasswordTokenExpiry', 'reset_password_token_expiry', 'expiryDate', 'expiry_date'
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

// Migrate users from file to database
async function migrateUsers() {
  console.log('Migrating users...');
  const dataDir = path.join(process.cwd(), 'data');
  const usersFilePath = path.join(dataDir, 'users.json');
  
  if (!fs.existsSync(usersFilePath)) {
    console.log('No users file found, skipping user migration');
    return;
  }
  
  const users = readJsonFile(usersFilePath);
  console.log(`Found ${users.length} users to migrate`);
  
  let migratedCount = 0;
  
  for (const user of users) {
    try {
      // Check if user already exists
      const existingUser = await db.select()
        .from(schema.users)
        .where(eq(schema.users.username, user.username))
        .limit(1);
      
      if (existingUser.length > 0) {
        console.log(`User ${user.username} already exists, skipping`);
        continue;
      }
      
      // Process dates in user object
      const processedUser = processDates(user);
      
      // Insert user
      await db.insert(schema.users).values({
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
      });
      
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating user ${user.username}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} users successfully`);
}

// Migrate teams from file to database
async function migrateTeams() {
  console.log('Migrating teams...');
  const dataDir = path.join(process.cwd(), 'data');
  const teamsFilePath = path.join(dataDir, 'teams.json');
  
  if (!fs.existsSync(teamsFilePath)) {
    console.log('No teams file found, skipping team migration');
    return;
  }
  
  const teams = readJsonFile(teamsFilePath);
  console.log(`Found ${teams.length} teams to migrate`);
  
  let migratedCount = 0;
  
  for (const team of teams) {
    try {
      // Check if team already exists
      const existingTeam = await db.select()
        .from(schema.teams)
        .where(eq(schema.teams.id, team.id))
        .limit(1);
      
      if (existingTeam.length > 0) {
        console.log(`Team ID ${team.id} already exists, skipping`);
        continue;
      }
      
      // Process dates in team object
      const processedTeam = processDates(team);
      
      // Insert team
      await db.insert(schema.teams).values({
        id: processedTeam.id,
        name: processedTeam.name,
        sport: processedTeam.sport,
        logo: processedTeam.logo,
        colors: processedTeam.colors,
        joinCode: processedTeam.joinCode,
        createdBy: processedTeam.createdBy,
        createdAt: processedTeam.createdAt || new Date()
      });
      
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating team ${team.name}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} teams successfully`);
}

// Migrate team members from file to database
async function migrateTeamMembers() {
  console.log('Migrating team members...');
  const dataDir = path.join(process.cwd(), 'data');
  const teamMembersFilePath = path.join(dataDir, 'team_members.json');
  
  if (!fs.existsSync(teamMembersFilePath)) {
    console.log('No team_members file found, skipping team members migration');
    return;
  }
  
  const teamMembers = readJsonFile(teamMembersFilePath);
  console.log(`Found ${teamMembers.length} team members to migrate`);
  
  let migratedCount = 0;
  
  for (const member of teamMembers) {
    try {
      // Check if team member already exists
      const existingMember = await db.select()
        .from(schema.teamMembers)
        .where(eq(schema.teamMembers.id, member.id))
        .limit(1);
      
      if (existingMember.length > 0) {
        console.log(`Team member ID ${member.id} already exists, skipping`);
        continue;
      }
      
      // Process dates in member object
      const processedMember = processDates(member);
      
      // Insert team member
      await db.insert(schema.teamMembers).values({
        id: processedMember.id,
        userId: processedMember.userId,
        teamId: processedMember.teamId,
        role: processedMember.role,
        position: processedMember.position,
        jerseyNumber: processedMember.jerseyNumber,
        joinedAt: processedMember.joinedAt || new Date()
      });
      
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating team member ${member.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} team members successfully`);
}

// Migrate matches from file to database
async function migrateMatches() {
  console.log('Migrating matches...');
  const dataDir = path.join(process.cwd(), 'data');
  const matchesFilePath = path.join(dataDir, 'matches.json');
  
  if (!fs.existsSync(matchesFilePath)) {
    console.log('No matches file found, skipping matches migration');
    return;
  }
  
  const matches = readJsonFile(matchesFilePath);
  console.log(`Found ${matches.length} matches to migrate`);
  
  let migratedCount = 0;
  
  for (const match of matches) {
    try {
      // Check if match already exists
      const existingMatch = await db.select()
        .from(schema.matches)
        .where(eq(schema.matches.id, match.id))
        .limit(1);
      
      if (existingMatch.length > 0) {
        console.log(`Match ID ${match.id} already exists, skipping`);
        continue;
      }
      
      // Process dates in match object
      const processedMatch = processDates(match);
      
      // Ensure match has a valid match type
      if (!processedMatch.matchType) {
        processedMatch.matchType = 'friendly';
      }
      
      // Insert match
      await db.insert(schema.matches).values({
        id: processedMatch.id,
        teamId: processedMatch.teamId,
        status: processedMatch.status,
        opponentName: processedMatch.opponentName,
        opponentLogo: processedMatch.opponentLogo,
        matchDate: processedMatch.matchDate,
        location: processedMatch.location,
        isHome: processedMatch.isHome,
        goalsScored: processedMatch.goalsScored,
        goalsConceded: processedMatch.goalsConceded,
        matchType: processedMatch.matchType,
        notes: processedMatch.notes
      });
      
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating match ${match.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} matches successfully`);
}

// Migrate events from file to database
async function migrateEvents() {
  console.log('Migrating events...');
  const dataDir = path.join(process.cwd(), 'data');
  const eventsFilePath = path.join(dataDir, 'events.json');
  
  if (!fs.existsSync(eventsFilePath)) {
    console.log('No events file found, skipping events migration');
    return;
  }
  
  const events = readJsonFile(eventsFilePath);
  console.log(`Found ${events.length} events to migrate`);
  
  let migratedCount = 0;
  
  for (const event of events) {
    try {
      // Check if event already exists
      const existingEvent = await db.select()
        .from(schema.events)
        .where(eq(schema.events.id, event.id))
        .limit(1);
      
      if (existingEvent.length > 0) {
        console.log(`Event ID ${event.id} already exists, skipping`);
        continue;
      }
      
      // Process dates in event object
      const processedEvent = processDates(event);
      
      // Insert event
      await db.insert(schema.events).values({
        id: processedEvent.id,
        teamId: processedEvent.teamId,
        title: processedEvent.title,
        description: processedEvent.description,
        eventType: processedEvent.eventType,
        startTime: processedEvent.startTime,
        endTime: processedEvent.endTime,
        location: processedEvent.location,
        createdAt: processedEvent.createdAt || new Date()
      });
      
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating event ${event.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} events successfully`);
}

// Migrate attendances from file to database
async function migrateAttendances() {
  console.log('Migrating attendances...');
  const dataDir = path.join(process.cwd(), 'data');
  const attendancesFilePath = path.join(dataDir, 'attendance.json');
  
  if (!fs.existsSync(attendancesFilePath)) {
    console.log('No attendance file found, skipping attendance migration');
    return;
  }
  
  const attendances = readJsonFile(attendancesFilePath);
  console.log(`Found ${attendances.length} attendances to migrate`);
  
  let migratedCount = 0;
  
  for (const attendance of attendances) {
    try {
      // Check if attendance already exists
      const existingAttendance = await db.select()
        .from(schema.attendance)
        .where(eq(schema.attendance.id, attendance.id))
        .limit(1);
      
      if (existingAttendance.length > 0) {
        console.log(`Attendance ID ${attendance.id} already exists, skipping`);
        continue;
      }
      
      // Process dates in attendance object
      const processedAttendance = processDates(attendance);
      
      // Insert attendance
      await db.insert(schema.attendance).values({
        id: processedAttendance.id,
        userId: processedAttendance.userId,
        eventId: processedAttendance.eventId,
        status: processedAttendance.status,
        createdAt: processedAttendance.createdAt || new Date()
      });
      
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating attendance ${attendance.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} attendances successfully`);
}

// Migrate player stats from file to database
async function migratePlayerStats() {
  console.log('Migrating player stats...');
  const dataDir = path.join(process.cwd(), 'data');
  const playerStatsFilePath = path.join(dataDir, 'player_stats.json');
  
  if (!fs.existsSync(playerStatsFilePath)) {
    console.log('No player_stats file found, skipping player stats migration');
    return;
  }
  
  const playerStats = readJsonFile(playerStatsFilePath);
  console.log(`Found ${playerStats.length} player stats to migrate`);
  
  let migratedCount = 0;
  
  for (const stat of playerStats) {
    try {
      // Check if player stat already exists
      const existingStat = await db.select()
        .from(schema.playerStats)
        .where(eq(schema.playerStats.id, stat.id))
        .limit(1);
      
      if (existingStat.length > 0) {
        console.log(`Player stat ID ${stat.id} already exists, skipping`);
        continue;
      }
      
      // Process dates in stat object
      const processedStat = processDates(stat);
      
      // Insert player stat
      await db.insert(schema.playerStats).values({
        id: processedStat.id,
        userId: processedStat.userId,
        matchId: processedStat.matchId,
        minutesPlayed: processedStat.minutesPlayed,
        goals: processedStat.goals || 0,
        assists: processedStat.assists || 0,
        yellowCards: processedStat.yellowCards || 0,
        redCards: processedStat.redCards || 0,
        createdAt: processedStat.createdAt || new Date()
      });
      
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating player stat ${stat.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} player stats successfully`);
}

// Migrate announcements from file to database
async function migrateAnnouncements() {
  console.log('Migrating announcements...');
  const dataDir = path.join(process.cwd(), 'data');
  const announcementsFilePath = path.join(dataDir, 'announcements.json');
  
  if (!fs.existsSync(announcementsFilePath)) {
    console.log('No announcements file found, skipping announcements migration');
    return;
  }
  
  const announcements = readJsonFile(announcementsFilePath);
  console.log(`Found ${announcements.length} announcements to migrate`);
  
  let migratedCount = 0;
  
  for (const announcement of announcements) {
    try {
      // Check if announcement already exists
      const existingAnnouncement = await db.select()
        .from(schema.announcements)
        .where(eq(schema.announcements.id, announcement.id))
        .limit(1);
      
      if (existingAnnouncement.length > 0) {
        console.log(`Announcement ID ${announcement.id} already exists, skipping`);
        continue;
      }
      
      // Process dates in announcement object
      const processedAnnouncement = processDates(announcement);
      
      // Insert announcement
      await db.insert(schema.announcements).values({
        id: processedAnnouncement.id,
        teamId: processedAnnouncement.teamId,
        createdById: processedAnnouncement.createdById,
        title: processedAnnouncement.title,
        content: processedAnnouncement.content,
        createdAt: processedAnnouncement.createdAt || new Date()
      });
      
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating announcement ${announcement.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} announcements successfully`);
}

// Migrate invitations from file to database
async function migrateInvitations() {
  console.log('Migrating invitations...');
  const dataDir = path.join(process.cwd(), 'data');
  const invitationsFilePath = path.join(dataDir, 'invitations.json');
  
  if (!fs.existsSync(invitationsFilePath)) {
    console.log('No invitations file found, skipping invitations migration');
    return;
  }
  
  const invitations = readJsonFile(invitationsFilePath);
  console.log(`Found ${invitations.length} invitations to migrate`);
  
  let migratedCount = 0;
  
  for (const invitation of invitations) {
    try {
      // Check if invitation already exists
      const existingInvitation = await db.select()
        .from(schema.invitations)
        .where(eq(schema.invitations.id, invitation.id))
        .limit(1);
      
      if (existingInvitation.length > 0) {
        console.log(`Invitation ID ${invitation.id} already exists, skipping`);
        continue;
      }
      
      // Process dates in invitation object
      const processedInvitation = processDates(invitation);
      
      // Insert invitation
      await db.insert(schema.invitations).values({
        id: processedInvitation.id,
        teamId: processedInvitation.teamId,
        email: processedInvitation.email,
        invitationCode: processedInvitation.invitationCode,
        role: processedInvitation.role,
        status: processedInvitation.status,
        createdAt: processedInvitation.createdAt || new Date(),
        expiryDate: processedInvitation.expiryDate
      });
      
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating invitation ${invitation.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} invitations successfully`);
}

// Migrate match lineups from file to database
async function migrateMatchLineups() {
  console.log('Migrating match lineups...');
  const dataDir = path.join(process.cwd(), 'data');
  const lineupsFilePath = path.join(dataDir, 'match_lineups.json');
  
  if (!fs.existsSync(lineupsFilePath)) {
    console.log('No match_lineups file found, skipping match lineups migration');
    return;
  }
  
  const lineups = readJsonFile(lineupsFilePath);
  console.log(`Found ${lineups.length} match lineups to migrate`);
  
  let migratedCount = 0;
  
  for (const lineup of lineups) {
    try {
      // Check if lineup already exists
      const existingLineup = await db.select()
        .from(schema.matchLineups)
        .where(eq(schema.matchLineups.id, lineup.id))
        .limit(1);
      
      if (existingLineup.length > 0) {
        console.log(`Match lineup ID ${lineup.id} already exists, skipping`);
        continue;
      }
      
      // Process dates in lineup object
      const processedLineup = processDates(lineup);
      
      // Insert match lineup
      await db.insert(schema.matchLineups).values({
        id: processedLineup.id,
        matchId: processedLineup.matchId,
        teamId: processedLineup.teamId,
        playerIds: processedLineup.playerIds,
        benchPlayerIds: processedLineup.benchPlayerIds || null,
        formation: processedLineup.formation,
        positionMapping: processedLineup.positionMapping || {},
        createdAt: processedLineup.createdAt || new Date()
      });
      
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating match lineup ${lineup.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} match lineups successfully`);
}

// Migrate team lineups from file to database
async function migrateTeamLineups() {
  console.log('Migrating team lineups...');
  const dataDir = path.join(process.cwd(), 'data');
  const lineupsFilePath = path.join(dataDir, 'team_lineups.json');
  
  if (!fs.existsSync(lineupsFilePath)) {
    console.log('No team_lineups file found, skipping team lineups migration');
    return;
  }
  
  const lineups = readJsonFile(lineupsFilePath);
  console.log(`Found ${lineups.length} team lineups to migrate`);
  
  let migratedCount = 0;
  
  for (const lineup of lineups) {
    try {
      // Check if lineup already exists
      const existingLineup = await db.select()
        .from(schema.teamLineups)
        .where(eq(schema.teamLineups.id, lineup.id))
        .limit(1);
      
      if (existingLineup.length > 0) {
        console.log(`Team lineup ID ${lineup.id} already exists, skipping`);
        continue;
      }
      
      // Process dates in lineup object
      const processedLineup = processDates(lineup);
      
      // Insert team lineup
      await db.insert(schema.teamLineups).values({
        id: processedLineup.id,
        teamId: processedLineup.teamId,
        formation: processedLineup.formation,
        positionMapping: processedLineup.positionMapping || {},
        createdAt: processedLineup.createdAt || new Date(),
        updatedAt: processedLineup.updatedAt || new Date()
      });
      
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating team lineup ${lineup.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} team lineups successfully`);
}

// Migrate match substitutions from file to database
async function migrateMatchSubstitutions() {
  console.log('Migrating match substitutions...');
  const dataDir = path.join(process.cwd(), 'data');
  const substitutionsFilePath = path.join(dataDir, 'match_substitutions.json');
  
  if (!fs.existsSync(substitutionsFilePath)) {
    console.log('No match_substitutions file found, skipping match substitutions migration');
    return;
  }
  
  const substitutions = readJsonFile(substitutionsFilePath);
  console.log(`Found ${substitutions.length} match substitutions to migrate`);
  
  let migratedCount = 0;
  
  for (const substitution of substitutions) {
    try {
      // Check if substitution already exists
      const existingSubstitution = await db.select()
        .from(schema.matchSubstitutions)
        .where(eq(schema.matchSubstitutions.id, substitution.id))
        .limit(1);
      
      if (existingSubstitution.length > 0) {
        console.log(`Match substitution ID ${substitution.id} already exists, skipping`);
        continue;
      }
      
      // Process dates in substitution object
      const processedSubstitution = processDates(substitution);
      
      // Insert match substitution
      await db.insert(schema.matchSubstitutions).values({
        id: processedSubstitution.id,
        matchId: processedSubstitution.matchId,
        playerInId: processedSubstitution.playerInId,
        playerOutId: processedSubstitution.playerOutId,
        minute: processedSubstitution.minute,
        reason: processedSubstitution.reason,
        createdAt: processedSubstitution.createdAt || new Date()
      });
      
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating match substitution ${substitution.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} match substitutions successfully`);
}

// Migrate match goals from file to database
async function migrateMatchGoals() {
  console.log('Migrating match goals...');
  const dataDir = path.join(process.cwd(), 'data');
  const goalsFilePath = path.join(dataDir, 'match_goals.json');
  
  if (!fs.existsSync(goalsFilePath)) {
    console.log('No match_goals file found, skipping match goals migration');
    return;
  }
  
  const goals = readJsonFile(goalsFilePath);
  console.log(`Found ${goals.length} match goals to migrate`);
  
  let migratedCount = 0;
  
  for (const goal of goals) {
    try {
      // Check if goal already exists
      const existingGoal = await db.select()
        .from(schema.matchGoals)
        .where(eq(schema.matchGoals.id, goal.id))
        .limit(1);
      
      if (existingGoal.length > 0) {
        console.log(`Match goal ID ${goal.id} already exists, skipping`);
        continue;
      }
      
      // Process dates in goal object
      const processedGoal = processDates(goal);
      
      // Insert match goal
      await db.insert(schema.matchGoals).values({
        id: processedGoal.id,
        matchId: processedGoal.matchId,
        scorerId: processedGoal.scorerId,
        assisterId: processedGoal.assisterId,
        minute: processedGoal.minute,
        description: processedGoal.description,
        createdAt: processedGoal.createdAt || new Date()
      });
      
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating match goal ${goal.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} match goals successfully`);
}

// Migrate match cards from file to database
async function migrateMatchCards() {
  console.log('Migrating match cards...');
  const dataDir = path.join(process.cwd(), 'data');
  const cardsFilePath = path.join(dataDir, 'match_cards.json');
  
  if (!fs.existsSync(cardsFilePath)) {
    console.log('No match_cards file found, skipping match cards migration');
    return;
  }
  
  const cards = readJsonFile(cardsFilePath);
  console.log(`Found ${cards.length} match cards to migrate`);
  
  let migratedCount = 0;
  
  for (const card of cards) {
    try {
      // Check if card already exists
      const existingCard = await db.select()
        .from(schema.matchCards)
        .where(eq(schema.matchCards.id, card.id))
        .limit(1);
      
      if (existingCard.length > 0) {
        console.log(`Match card ID ${card.id} already exists, skipping`);
        continue;
      }
      
      // Process dates in card object
      const processedCard = processDates(card);
      
      // Insert match card
      await db.insert(schema.matchCards).values({
        id: processedCard.id,
        matchId: processedCard.matchId,
        playerId: processedCard.playerId,
        cardType: processedCard.cardType,
        minute: processedCard.minute,
        reason: processedCard.reason,
        createdAt: processedCard.createdAt || new Date()
      });
      
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating match card ${card.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} match cards successfully`);
}

// Migrate match photos from file to database
async function migrateMatchPhotos() {
  console.log('Migrating match photos...');
  const dataDir = path.join(process.cwd(), 'data');
  const photosFilePath = path.join(dataDir, 'match_photos.json');
  
  if (!fs.existsSync(photosFilePath)) {
    console.log('No match_photos file found, skipping match photos migration');
    return;
  }
  
  const photos = readJsonFile(photosFilePath);
  console.log(`Found ${photos.length} match photos to migrate`);
  
  let migratedCount = 0;
  
  for (const photo of photos) {
    try {
      // Check if photo already exists
      const existingPhoto = await db.select()
        .from(schema.matchPhotos)
        .where(eq(schema.matchPhotos.id, photo.id))
        .limit(1);
      
      if (existingPhoto.length > 0) {
        console.log(`Match photo ID ${photo.id} already exists, skipping`);
        continue;
      }
      
      // Process dates in photo object
      const processedPhoto = processDates(photo);
      
      // Insert match photo
      await db.insert(schema.matchPhotos).values({
        id: processedPhoto.id,
        matchId: processedPhoto.matchId,
        imageUrl: processedPhoto.imageUrl,
        caption: processedPhoto.caption,
        uploadedById: processedPhoto.uploadedById,
        uploadedAt: processedPhoto.uploadedAt || new Date()
      });
      
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating match photo ${photo.id}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} match photos successfully`);
}

// Migrate league classifications from file to database
async function migrateLeagueClassifications() {
  console.log('Migrating league classifications...');
  const dataDir = path.join(process.cwd(), 'data');
  const classificationsFilePath = path.join(dataDir, 'league_classifications.json');
  
  if (!fs.existsSync(classificationsFilePath)) {
    console.log('No league_classifications file found, skipping league classifications migration');
    return;
  }
  
  const classifications = readJsonFile(classificationsFilePath);
  console.log(`Found ${classifications.length} league classifications to migrate`);
  
  let migratedCount = 0;
  
  for (const classification of classifications) {
    try {
      // Check if classification already exists
      const existingClassification = await db.select()
        .from(schema.leagueClassification)
        .where(eq(schema.leagueClassification.id, classification.id))
        .limit(1);
      
      if (existingClassification.length > 0) {
        console.log(`League classification ID ${classification.id} already exists, skipping`);
        continue;
      }
      
      // Process dates in classification object
      const processedClassification = processDates(classification);
      
      // Ensure points is not undefined
      if (processedClassification.points === undefined) {
        processedClassification.points = 0;
      }
      
      // Insert league classification
      await db.insert(schema.leagueClassification).values({
        id: processedClassification.id,
        teamId: processedClassification.teamId,
        externalTeamName: processedClassification.externalTeamName,
        position: processedClassification.position,
        points: processedClassification.points,
        gamesPlayed: processedClassification.gamesPlayed,
        gamesWon: processedClassification.gamesWon,
        gamesDrawn: processedClassification.gamesDrawn,
        gamesLost: processedClassification.gamesLost,
        goalsFor: processedClassification.goalsFor,
        goalsAgainst: processedClassification.goalsAgainst,
        createdAt: processedClassification.createdAt || new Date(),
        updatedAt: processedClassification.updatedAt || new Date()
      });
      
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
  } catch (error) {
    console.error('Error during data migration:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the migration
migrateData();