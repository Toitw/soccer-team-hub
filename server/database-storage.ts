import {
  type User, type InsertUser, users,
  type Team, type InsertTeam, teams,
  type TeamMember, type InsertTeamMember, teamMembers,
  type Match, type InsertMatch, matches,
  type Event, type InsertEvent, events,
  type Attendance, type InsertAttendance, attendance,
  type PlayerStat, type InsertPlayerStat, playerStats,
  type Announcement, type InsertAnnouncement, announcements,
  type Invitation, type InsertInvitation, invitations,
  type MatchLineup, type InsertMatchLineup, matchLineups,
  type TeamLineup, type InsertTeamLineup, teamLineups,
  type MatchSubstitution, type InsertMatchSubstitution, matchSubstitutions,
  type MatchGoal, type InsertMatchGoal, matchGoals,
  type MatchCard, type InsertMatchCard, matchCards,
  type MatchPhoto, type InsertMatchPhoto, matchPhotos,
  type LeagueClassification, type InsertLeagueClassification, leagueClassification
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, lte, gte, sql } from "drizzle-orm";
import { IStorage } from "./storage";
import session from "express-session";
import { Store as SessionStore } from "express-session";
import connectPgSimple from "connect-pg-simple";
import { hashPassword } from "@shared/auth-utils";

// Use PostgreSQL for session storage
const PgStore = connectPgSimple(session);

/**
 * Implementation of IStorage using PostgreSQL database
 */
export class DatabaseStorage implements IStorage {
  sessionStore: SessionStore;

  constructor() {
    // Initialize session store with PostgreSQL
    // Create the PostgreSQL session store
    const pgStore = new PgStore({
      conString: process.env.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: true,
    });
    
    // Assign to sessionStore with appropriate type handling
    this.sessionStore = pgStore;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async createUser(userData: InsertUser): Promise<User> {
    // Hash password if needed
    if (userData.password && !userData.password.startsWith('$argon2')) {
      userData.password = await hashPassword(userData.password);
    }
    
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    // Hash password if it's being updated
    if (userData.password && !userData.password.startsWith('$argon2')) {
      userData.password = await hashPassword(userData.password);
    }
    
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return true;
  }

  // Team methods
  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async getTeams(): Promise<Team[]> {
    return db.select().from(teams);
  }

  async getTeamsByUserId(userId: number): Promise<Team[]> {
    // Find all team memberships for this user
    const userTeamMembers = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));
    
    // Get all teams for these memberships
    const teamIds = userTeamMembers.map(member => member.teamId);
    
    if (teamIds.length === 0) {
      return [];
    }
    
    return db
      .select()
      .from(teams)
      .where(
        sql`${teams.id} IN ${teamIds}`
      );
  }

  async getTeamByJoinCode(joinCode: string): Promise<Team | undefined> {
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.joinCode, joinCode));
    
    return team;
  }

  async createTeam(teamData: InsertTeam): Promise<Team> {
    const [team] = await db.insert(teams).values(teamData).returning();
    return team;
  }

  async updateTeam(id: number, teamData: Partial<Team>): Promise<Team | undefined> {
    const [updatedTeam] = await db
      .update(teams)
      .set(teamData)
      .where(eq(teams.id, id))
      .returning();
    
    return updatedTeam;
  }

  async deleteTeam(id: number): Promise<boolean> {
    await db.delete(teams).where(eq(teams.id, id));
    return true;
  }

  // TeamMember methods
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));
  }

  async getTeamMember(teamId: number, userId: number): Promise<TeamMember | undefined> {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId)
        )
      );
    
    return member;
  }

  async getTeamMembersByUserId(userId: number): Promise<TeamMember[]> {
    return db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));
  }

  async createTeamMember(teamMemberData: InsertTeamMember): Promise<TeamMember> {
    const [member] = await db
      .insert(teamMembers)
      .values(teamMemberData)
      .returning();
    
    return member;
  }

  async updateTeamMember(id: number, teamMemberData: Partial<TeamMember>): Promise<TeamMember | undefined> {
    const [updatedMember] = await db
      .update(teamMembers)
      .set(teamMemberData)
      .where(eq(teamMembers.id, id))
      .returning();
    
    return updatedMember;
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
    return true;
  }

  // Match methods
  async getMatch(id: number): Promise<Match | undefined> {
    const [match] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, id));
    
    return match;
  }

  async getMatches(teamId: number): Promise<Match[]> {
    return db
      .select()
      .from(matches)
      .where(eq(matches.teamId, teamId))
      .orderBy(desc(matches.matchDate));
  }

  async getRecentMatches(teamId: number, limit: number): Promise<Match[]> {
    return db
      .select()
      .from(matches)
      .where(eq(matches.teamId, teamId))
      .orderBy(desc(matches.matchDate))
      .limit(limit);
  }

  async createMatch(matchData: InsertMatch): Promise<Match> {
    const [match] = await db
      .insert(matches)
      .values(matchData)
      .returning();
    
    return match;
  }

  async updateMatch(id: number, matchData: Partial<Match>): Promise<Match | undefined> {
    const [updatedMatch] = await db
      .update(matches)
      .set(matchData)
      .where(eq(matches.id, id))
      .returning();
    
    return updatedMatch;
  }
  
  async deleteMatch(id: number): Promise<boolean> {
    await db.delete(matches).where(eq(matches.id, id));
    return true;
  }

  // Event methods
  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, id));
    
    return event;
  }

  async getEvents(teamId: number): Promise<Event[]> {
    return db
      .select()
      .from(events)
      .where(eq(events.teamId, teamId))
      .orderBy(events.startTime);
  }

  async getUpcomingEvents(teamId: number, limit: number): Promise<Event[]> {
    const now = new Date();
    
    return db
      .select()
      .from(events)
      .where(
        and(
          eq(events.teamId, teamId),
          gte(events.startTime, now)
        )
      )
      .orderBy(events.startTime)
      .limit(limit);
  }

  async createEvent(eventData: InsertEvent): Promise<Event> {
    const [event] = await db
      .insert(events)
      .values(eventData)
      .returning();
    
    return event;
  }

  async updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined> {
    const [updatedEvent] = await db
      .update(events)
      .set(eventData)
      .where(eq(events.id, id))
      .returning();
    
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    await db.delete(events).where(eq(events.id, id));
    return true;
  }

  // Attendance methods
  async getAttendance(eventId: number): Promise<Attendance[]> {
    return db
      .select()
      .from(attendance)
      .where(eq(attendance.eventId, eventId));
  }

  async getUserAttendance(userId: number): Promise<Attendance[]> {
    return db
      .select()
      .from(attendance)
      .where(eq(attendance.userId, userId));
  }

  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const [record] = await db
      .insert(attendance)
      .values(attendanceData)
      .returning();
    
    return record;
  }

  async updateAttendance(id: number, attendanceData: Partial<Attendance>): Promise<Attendance | undefined> {
    const [updatedRecord] = await db
      .update(attendance)
      .set(attendanceData)
      .where(eq(attendance.id, id))
      .returning();
    
    return updatedRecord;
  }

  // PlayerStat methods
  async getPlayerStats(userId: number): Promise<PlayerStat[]> {
    return db
      .select()
      .from(playerStats)
      .where(eq(playerStats.userId, userId));
  }

  async getMatchPlayerStats(matchId: number): Promise<PlayerStat[]> {
    return db
      .select()
      .from(playerStats)
      .where(eq(playerStats.matchId, matchId));
  }

  async createPlayerStat(playerStatData: InsertPlayerStat): Promise<PlayerStat> {
    const [stat] = await db
      .insert(playerStats)
      .values(playerStatData)
      .returning();
    
    return stat;
  }

  async updatePlayerStat(id: number, playerStatData: Partial<PlayerStat>): Promise<PlayerStat | undefined> {
    const [updatedStat] = await db
      .update(playerStats)
      .set(playerStatData)
      .where(eq(playerStats.id, id))
      .returning();
    
    return updatedStat;
  }

  // Announcement methods
  async getAnnouncement(id: number): Promise<Announcement | undefined> {
    const [announcement] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id));
    
    return announcement;
  }

  async getAnnouncements(teamId: number): Promise<Announcement[]> {
    return db
      .select()
      .from(announcements)
      .where(eq(announcements.teamId, teamId))
      .orderBy(desc(announcements.createdAt));
  }

  async getRecentAnnouncements(teamId: number, limit: number): Promise<Announcement[]> {
    return db
      .select()
      .from(announcements)
      .where(eq(announcements.teamId, teamId))
      .orderBy(desc(announcements.createdAt))
      .limit(limit);
  }

  async createAnnouncement(announcementData: InsertAnnouncement): Promise<Announcement> {
    const [announcement] = await db
      .insert(announcements)
      .values(announcementData)
      .returning();
    
    return announcement;
  }

  async updateAnnouncement(id: number, announcementData: Partial<Announcement>): Promise<Announcement | undefined> {
    const [updatedAnnouncement] = await db
      .update(announcements)
      .set(announcementData)
      .where(eq(announcements.id, id))
      .returning();
    
    return updatedAnnouncement;
  }

  async deleteAnnouncement(id: number): Promise<boolean> {
    await db.delete(announcements).where(eq(announcements.id, id));
    return true;
  }

  // Invitation methods
  async getInvitation(id: number): Promise<Invitation | undefined> {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, id));
    
    return invitation;
  }

  async getInvitations(teamId: number): Promise<Invitation[]> {
    return db
      .select()
      .from(invitations)
      .where(eq(invitations.teamId, teamId));
  }

  async createInvitation(invitationData: InsertInvitation): Promise<Invitation> {
    const [invitation] = await db
      .insert(invitations)
      .values(invitationData)
      .returning();
    
    return invitation;
  }

  async updateInvitation(id: number, invitationData: Partial<Invitation>): Promise<Invitation | undefined> {
    const [updatedInvitation] = await db
      .update(invitations)
      .set(invitationData)
      .where(eq(invitations.id, id))
      .returning();
    
    return updatedInvitation;
  }

  // Match Lineup methods
  async getMatchLineup(matchId: number): Promise<MatchLineup | undefined> {
    const [lineup] = await db
      .select()
      .from(matchLineups)
      .where(eq(matchLineups.matchId, matchId));
    
    return lineup;
  }

  async createMatchLineup(lineupData: InsertMatchLineup): Promise<MatchLineup> {
    const [lineup] = await db
      .insert(matchLineups)
      .values(lineupData)
      .returning();
    
    return lineup;
  }

  async updateMatchLineup(id: number, lineupData: Partial<MatchLineup>): Promise<MatchLineup | undefined> {
    const [updatedLineup] = await db
      .update(matchLineups)
      .set(lineupData)
      .where(eq(matchLineups.id, id))
      .returning();
    
    return updatedLineup;
  }

  // Team Lineup methods
  async getTeamLineup(teamId: number): Promise<TeamLineup | undefined> {
    const [lineup] = await db
      .select()
      .from(teamLineups)
      .where(eq(teamLineups.teamId, teamId));
    
    return lineup;
  }

  async createTeamLineup(lineupData: InsertTeamLineup): Promise<TeamLineup> {
    const [lineup] = await db
      .insert(teamLineups)
      .values(lineupData)
      .returning();
    
    return lineup;
  }

  async updateTeamLineup(id: number, lineupData: Partial<TeamLineup>): Promise<TeamLineup | undefined> {
    const [updatedLineup] = await db
      .update(teamLineups)
      .set(lineupData)
      .where(eq(teamLineups.id, id))
      .returning();
    
    return updatedLineup;
  }

  // Match Substitution methods
  async getMatchSubstitutions(matchId: number): Promise<MatchSubstitution[]> {
    return db
      .select()
      .from(matchSubstitutions)
      .where(eq(matchSubstitutions.matchId, matchId))
      .orderBy(matchSubstitutions.minute);
  }

  async createMatchSubstitution(substitutionData: InsertMatchSubstitution): Promise<MatchSubstitution> {
    const [substitution] = await db
      .insert(matchSubstitutions)
      .values(substitutionData)
      .returning();
    
    return substitution;
  }

  async updateMatchSubstitution(id: number, substitutionData: Partial<MatchSubstitution>): Promise<MatchSubstitution | undefined> {
    const [updatedSubstitution] = await db
      .update(matchSubstitutions)
      .set(substitutionData)
      .where(eq(matchSubstitutions.id, id))
      .returning();
    
    return updatedSubstitution;
  }

  async deleteMatchSubstitution(id: number): Promise<boolean> {
    await db.delete(matchSubstitutions).where(eq(matchSubstitutions.id, id));
    return true;
  }

  // Match Goal methods
  async getMatchGoals(matchId: number): Promise<MatchGoal[]> {
    return db
      .select()
      .from(matchGoals)
      .where(eq(matchGoals.matchId, matchId))
      .orderBy(matchGoals.minute);
  }

  async createMatchGoal(goalData: InsertMatchGoal): Promise<MatchGoal> {
    const [goal] = await db
      .insert(matchGoals)
      .values(goalData)
      .returning();
    
    return goal;
  }

  async updateMatchGoal(id: number, goalData: Partial<MatchGoal>): Promise<MatchGoal | undefined> {
    const [updatedGoal] = await db
      .update(matchGoals)
      .set(goalData)
      .where(eq(matchGoals.id, id))
      .returning();
    
    return updatedGoal;
  }

  async deleteMatchGoal(id: number): Promise<boolean> {
    await db.delete(matchGoals).where(eq(matchGoals.id, id));
    return true;
  }

  // Match Card methods
  async getMatchCards(matchId: number): Promise<MatchCard[]> {
    return db
      .select()
      .from(matchCards)
      .where(eq(matchCards.matchId, matchId))
      .orderBy(matchCards.minute);
  }

  async createMatchCard(cardData: InsertMatchCard): Promise<MatchCard> {
    const [card] = await db
      .insert(matchCards)
      .values(cardData)
      .returning();
    
    return card;
  }

  async updateMatchCard(id: number, cardData: Partial<MatchCard>): Promise<MatchCard | undefined> {
    const [updatedCard] = await db
      .update(matchCards)
      .set(cardData)
      .where(eq(matchCards.id, id))
      .returning();
    
    return updatedCard;
  }

  async deleteMatchCard(id: number): Promise<boolean> {
    await db.delete(matchCards).where(eq(matchCards.id, id));
    return true;
  }

  // Match Photo methods
  async getMatchPhoto(id: number): Promise<MatchPhoto | undefined> {
    const [photo] = await db
      .select()
      .from(matchPhotos)
      .where(eq(matchPhotos.id, id));
    
    return photo;
  }

  async getMatchPhotos(matchId: number): Promise<MatchPhoto[]> {
    return db
      .select()
      .from(matchPhotos)
      .where(eq(matchPhotos.matchId, matchId))
      .orderBy(matchPhotos.uploadedAt);
  }

  async createMatchPhoto(photoData: InsertMatchPhoto): Promise<MatchPhoto> {
    const [photo] = await db
      .insert(matchPhotos)
      .values(photoData)
      .returning();
    
    return photo;
  }

  async updateMatchPhoto(id: number, photoData: Partial<MatchPhoto>): Promise<MatchPhoto | undefined> {
    const [updatedPhoto] = await db
      .update(matchPhotos)
      .set(photoData)
      .where(eq(matchPhotos.id, id))
      .returning();
    
    return updatedPhoto;
  }

  async deleteMatchPhoto(id: number): Promise<boolean> {
    await db.delete(matchPhotos).where(eq(matchPhotos.id, id));
    return true;
  }

  // League Classification methods
  async getLeagueClassifications(teamId: number): Promise<LeagueClassification[]> {
    return db
      .select()
      .from(leagueClassification)
      .where(eq(leagueClassification.teamId, teamId))
      .orderBy(leagueClassification.position);
  }

  async getLeagueClassification(id: number): Promise<LeagueClassification | undefined> {
    const [classification] = await db
      .select()
      .from(leagueClassification)
      .where(eq(leagueClassification.id, id));
    
    return classification;
  }

  async createLeagueClassification(classificationData: InsertLeagueClassification): Promise<LeagueClassification> {
    const [classification] = await db
      .insert(leagueClassification)
      .values(classificationData)
      .returning();
    
    return classification;
  }

  async updateLeagueClassification(id: number, classificationData: Partial<LeagueClassification>): Promise<LeagueClassification | undefined> {
    const [updatedClassification] = await db
      .update(leagueClassification)
      .set(classificationData)
      .where(eq(leagueClassification.id, id))
      .returning();
    
    return updatedClassification;
  }

  async deleteLeagueClassification(id: number): Promise<boolean> {
    await db.delete(leagueClassification).where(eq(leagueClassification.id, id));
    return true;
  }

  async bulkCreateLeagueClassifications(classifications: InsertLeagueClassification[]): Promise<LeagueClassification[]> {
    return db
      .insert(leagueClassification)
      .values(classifications)
      .returning();
  }

  async deleteAllTeamClassifications(teamId: number): Promise<boolean> {
    await db
      .delete(leagueClassification)
      .where(eq(leagueClassification.teamId, teamId));
    
    return true;
  }

  // Aliases for classification methods that match our API endpoints
  async getTeamClassifications(teamId: number): Promise<LeagueClassification[]> {
    return this.getLeagueClassifications(teamId);
  }

  async findClassificationById(id: number): Promise<LeagueClassification | undefined> {
    return this.getLeagueClassification(id);
  }

  async createClassification(teamId: number, classification: Partial<InsertLeagueClassification>): Promise<LeagueClassification> {
    // Ensure teamId is set
    const data = { ...classification, teamId } as InsertLeagueClassification;
    return this.createLeagueClassification(data);
  }

  async updateClassification(id: number, classificationData: Partial<LeagueClassification>): Promise<LeagueClassification | undefined> {
    return this.updateLeagueClassification(id, classificationData);
  }

  async deleteClassification(id: number): Promise<boolean> {
    return this.deleteLeagueClassification(id);
  }
}