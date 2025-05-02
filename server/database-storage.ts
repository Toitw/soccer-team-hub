import { 
  users, type User, type InsertUser,
  teams, type Team, type InsertTeam,
  teamMembers, type TeamMember, type InsertTeamMember,
  matches, type Match, type InsertMatch,
  events, type Event, type InsertEvent,
  attendance, type Attendance, type InsertAttendance,
  playerStats, type PlayerStat, type InsertPlayerStat,
  announcements, type Announcement, type InsertAnnouncement,
  invitations, type Invitation, type InsertInvitation,
  matchLineups, type MatchLineup, type InsertMatchLineup,
  teamLineups, type TeamLineup, type InsertTeamLineup,
  matchSubstitutions, type MatchSubstitution, type InsertMatchSubstitution,
  matchGoals, type MatchGoal, type InsertMatchGoal,
  matchCards, type MatchCard, type InsertMatchCard,
  matchPhotos, type MatchPhoto, type InsertMatchPhoto,
  leagueClassification, type LeagueClassification, type InsertLeagueClassification
} from "@shared/schema";
import { IStorage } from "./storage";
import { db } from "./db";
import { eq, and, desc, or, sql, isNull } from "drizzle-orm";
import createMemoryStore from "memorystore";
import session from "express-session";
import { PostgresError } from "postgres";

const MemoryStore = createMemoryStore(session);
type SessionStoreType = ReturnType<typeof createMemoryStore>;

/**
 * Database storage implementation using Drizzle ORM
 */
export class DatabaseStorage implements IStorage {
  sessionStore: SessionStoreType;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  /**
   * Check for integrity constraint violations and return appropriate error
   * Returns 409 Conflict for integrity constraint violations
   */
  private handleDatabaseError(error: any): never {
    console.error("Database error:", error);
    
    // PostgreSQL error codes
    if (error instanceof PostgresError || (error.code && typeof error.code === 'string')) {
      // Check for specific error types
      if (error.code === '23505') { // Unique violation
        let message = "Conflict: Record already exists";
        
        // Extract more detail about which constraint was violated when available
        if (error.detail) {
          if (error.detail.includes("team_members_team_id_user_id_unique")) {
            message = "Conflict: User is already a member of this team";
          } else if (error.detail.includes("attendance_event_id_user_id_unique")) {
            message = "Conflict: User already has attendance record for this event";
          } else if (error.detail.includes("player_stats_match_id_user_id_unique")) {
            message = "Conflict: Player already has stats for this match";
          } else if (error.detail.includes("invitations_team_id_email_unique")) {
            message = "Conflict: This email has already been invited to the team";
          } else if (error.detail.includes("league_classification_team_id_ext_team_unique")) {
            message = "Conflict: This team classification already exists";
          } else if (error.detail.includes("team_lineups_team_id_key")) {
            message = "Conflict: Team already has a default lineup";
          } else if (error.detail.includes("teams_join_code_key")) {
            message = "Conflict: Team with this join code already exists";
          }
        }
        
        const err = new Error(message);
        err.name = "ConflictError";
        (err as any).status = 409;
        throw err;
      } else if (error.code === '23503') { // Foreign key violation
        let message = "Reference integrity violation: Referenced record does not exist";

        // Extract more detail about which constraint was violated when available
        if (error.detail) {
          if (error.detail.includes("team_id")) {
            message = "Team does not exist or has been deleted";
          } else if (error.detail.includes("user_id") || error.detail.includes("player_id")) {
            message = "User does not exist or has been deleted";
          } else if (error.detail.includes("match_id")) {
            message = "Match does not exist or has been deleted";
          } else if (error.detail.includes("event_id")) {
            message = "Event does not exist or has been deleted";
          }
        }
        
        const err = new Error(message);
        err.name = "ForeignKeyError";
        (err as any).status = 409;
        throw err;
      } else if (error.code === '23502') { // Not null violation
        let message = "Required field missing";
        
        if (error.column) {
          message = `Required field missing: ${error.column}`;
        }
        
        const err = new Error(message);
        err.name = "NotNullError";
        (err as any).status = 400;
        throw err;
      } else if (error.code.startsWith('23')) { // Other integrity constraints
        const err = new Error("Data integrity constraint violation");
        err.name = "IntegrityError";
        (err as any).status = 409;
        throw err;
      }
    }
    
    // Default error handling
    const err = new Error("Database operation failed");
    err.name = "DatabaseError";
    (err as any).status = 500;
    throw err;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(users);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(userData).returning();
      return user;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      const [updatedUser] = await db.update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      const [deletedUser] = await db.delete(users)
        .where(eq(users.id, id))
        .returning();
      return !!deletedUser;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // Team methods
  async getTeam(id: number): Promise<Team | undefined> {
    try {
      const [team] = await db.select().from(teams).where(eq(teams.id, id));
      return team;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getTeams(): Promise<Team[]> {
    try {
      return await db.select().from(teams);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getTeamsByUserId(userId: number): Promise<Team[]> {
    try {
      const memberTeams = await db.select({
        teamId: teamMembers.teamId
      })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));
      
      if (memberTeams.length === 0) {
        return [];
      }
      
      const teamIds = memberTeams.map(mt => mt.teamId);
      return await db.select().from(teams).where(sql`${teams.id} IN ${teamIds}`);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getTeamByJoinCode(joinCode: string): Promise<Team | undefined> {
    try {
      const [team] = await db.select().from(teams).where(eq(teams.joinCode, joinCode));
      return team;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async createTeam(teamData: InsertTeam): Promise<Team> {
    try {
      const [team] = await db.insert(teams).values(teamData).returning();
      return team;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async updateTeam(id: number, teamData: Partial<Team>): Promise<Team | undefined> {
    try {
      const [updatedTeam] = await db.update(teams)
        .set(teamData)
        .where(eq(teams.id, id))
        .returning();
      return updatedTeam;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async deleteTeam(id: number): Promise<boolean> {
    try {
      const [deletedTeam] = await db.delete(teams)
        .where(eq(teams.id, id))
        .returning();
      return !!deletedTeam;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // TeamMember methods
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    try {
      return await db.select()
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId));
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getTeamMember(teamId: number, userId: number): Promise<TeamMember | undefined> {
    try {
      const [teamMember] = await db.select()
        .from(teamMembers)
        .where(and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId)
        ));
      return teamMember;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getTeamMembersByUserId(userId: number): Promise<TeamMember[]> {
    try {
      return await db.select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId));
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async createTeamMember(teamMemberData: InsertTeamMember): Promise<TeamMember> {
    try {
      const [teamMember] = await db.insert(teamMembers)
        .values(teamMemberData)
        .returning();
      return teamMember;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async updateTeamMember(id: number, teamMemberData: Partial<TeamMember>): Promise<TeamMember | undefined> {
    try {
      const [updatedTeamMember] = await db.update(teamMembers)
        .set(teamMemberData)
        .where(eq(teamMembers.id, id))
        .returning();
      return updatedTeamMember;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    try {
      const [deletedTeamMember] = await db.delete(teamMembers)
        .where(eq(teamMembers.id, id))
        .returning();
      return !!deletedTeamMember;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // Match methods
  async getMatch(id: number): Promise<Match | undefined> {
    try {
      const [match] = await db.select().from(matches).where(eq(matches.id, id));
      return match;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getMatches(teamId: number): Promise<Match[]> {
    try {
      return await db.select()
        .from(matches)
        .where(eq(matches.teamId, teamId))
        .orderBy(desc(matches.matchDate));
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getRecentMatches(teamId: number, limit: number): Promise<Match[]> {
    try {
      return await db.select()
        .from(matches)
        .where(eq(matches.teamId, teamId))
        .orderBy(desc(matches.matchDate))
        .limit(limit);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async createMatch(matchData: InsertMatch): Promise<Match> {
    try {
      const [match] = await db.insert(matches).values(matchData).returning();
      return match;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async updateMatch(id: number, matchData: Partial<Match>): Promise<Match | undefined> {
    try {
      const [updatedMatch] = await db.update(matches)
        .set(matchData)
        .where(eq(matches.id, id))
        .returning();
      return updatedMatch;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // Event methods
  async getEvent(id: number): Promise<Event | undefined> {
    try {
      const [event] = await db.select().from(events).where(eq(events.id, id));
      return event;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getEvents(teamId: number): Promise<Event[]> {
    try {
      return await db.select()
        .from(events)
        .where(eq(events.teamId, teamId))
        .orderBy(events.startTime);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getUpcomingEvents(teamId: number, limit: number): Promise<Event[]> {
    try {
      const now = new Date();
      return await db.select()
        .from(events)
        .where(and(
          eq(events.teamId, teamId),
          sql`${events.startTime} >= ${now}`
        ))
        .orderBy(events.startTime)
        .limit(limit);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async createEvent(eventData: InsertEvent): Promise<Event> {
    try {
      const [event] = await db.insert(events).values(eventData).returning();
      return event;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined> {
    try {
      const [updatedEvent] = await db.update(events)
        .set(eventData)
        .where(eq(events.id, id))
        .returning();
      return updatedEvent;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async deleteEvent(id: number): Promise<boolean> {
    try {
      const [deletedEvent] = await db.delete(events)
        .where(eq(events.id, id))
        .returning();
      return !!deletedEvent;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // Attendance methods
  async getAttendance(eventId: number): Promise<Attendance[]> {
    try {
      return await db.select()
        .from(attendance)
        .where(eq(attendance.eventId, eventId));
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getUserAttendance(userId: number): Promise<Attendance[]> {
    try {
      return await db.select()
        .from(attendance)
        .where(eq(attendance.userId, userId));
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    try {
      const [attendanceRecord] = await db.insert(attendance)
        .values(attendanceData)
        .returning();
      return attendanceRecord;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async updateAttendance(id: number, attendanceData: Partial<Attendance>): Promise<Attendance | undefined> {
    try {
      const [updatedAttendance] = await db.update(attendance)
        .set(attendanceData)
        .where(eq(attendance.id, id))
        .returning();
      return updatedAttendance;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // PlayerStat methods
  async getPlayerStats(userId: number): Promise<PlayerStat[]> {
    try {
      return await db.select()
        .from(playerStats)
        .where(eq(playerStats.userId, userId));
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getMatchPlayerStats(matchId: number): Promise<PlayerStat[]> {
    try {
      return await db.select()
        .from(playerStats)
        .where(eq(playerStats.matchId, matchId));
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async createPlayerStat(playerStatData: InsertPlayerStat): Promise<PlayerStat> {
    try {
      const [playerStat] = await db.insert(playerStats)
        .values(playerStatData)
        .returning();
      return playerStat;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async updatePlayerStat(id: number, playerStatData: Partial<PlayerStat>): Promise<PlayerStat | undefined> {
    try {
      const [updatedPlayerStat] = await db.update(playerStats)
        .set(playerStatData)
        .where(eq(playerStats.id, id))
        .returning();
      return updatedPlayerStat;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // Announcement methods
  async getAnnouncement(id: number): Promise<Announcement | undefined> {
    try {
      const [announcement] = await db.select()
        .from(announcements)
        .where(eq(announcements.id, id));
      return announcement;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getAnnouncements(teamId: number): Promise<Announcement[]> {
    try {
      return await db.select()
        .from(announcements)
        .where(eq(announcements.teamId, teamId))
        .orderBy(desc(announcements.createdAt));
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getRecentAnnouncements(teamId: number, limit: number): Promise<Announcement[]> {
    try {
      return await db.select()
        .from(announcements)
        .where(eq(announcements.teamId, teamId))
        .orderBy(desc(announcements.createdAt))
        .limit(limit);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async createAnnouncement(announcementData: InsertAnnouncement): Promise<Announcement> {
    try {
      const [announcement] = await db.insert(announcements)
        .values(announcementData)
        .returning();
      return announcement;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async updateAnnouncement(id: number, announcementData: Partial<Announcement>): Promise<Announcement | undefined> {
    try {
      const [updatedAnnouncement] = await db.update(announcements)
        .set(announcementData)
        .where(eq(announcements.id, id))
        .returning();
      return updatedAnnouncement;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async deleteAnnouncement(id: number): Promise<boolean> {
    try {
      const [deletedAnnouncement] = await db.delete(announcements)
        .where(eq(announcements.id, id))
        .returning();
      return !!deletedAnnouncement;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // Invitation methods
  async getInvitation(id: number): Promise<Invitation | undefined> {
    try {
      const [invitation] = await db.select()
        .from(invitations)
        .where(eq(invitations.id, id));
      return invitation;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getInvitations(teamId: number): Promise<Invitation[]> {
    try {
      return await db.select()
        .from(invitations)
        .where(eq(invitations.teamId, teamId));
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async createInvitation(invitationData: InsertInvitation): Promise<Invitation> {
    try {
      const [invitation] = await db.insert(invitations)
        .values(invitationData)
        .returning();
      return invitation;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async updateInvitation(id: number, invitationData: Partial<Invitation>): Promise<Invitation | undefined> {
    try {
      const [updatedInvitation] = await db.update(invitations)
        .set(invitationData)
        .where(eq(invitations.id, id))
        .returning();
      return updatedInvitation;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // Match Lineup methods
  async getMatchLineup(matchId: number): Promise<MatchLineup | undefined> {
    try {
      const [lineup] = await db.select()
        .from(matchLineups)
        .where(eq(matchLineups.matchId, matchId));
      return lineup;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async createMatchLineup(lineupData: InsertMatchLineup): Promise<MatchLineup> {
    try {
      const [lineup] = await db.insert(matchLineups)
        .values(lineupData)
        .returning();
      return lineup;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async updateMatchLineup(id: number, lineupData: Partial<MatchLineup>): Promise<MatchLineup | undefined> {
    try {
      const [updatedLineup] = await db.update(matchLineups)
        .set(lineupData)
        .where(eq(matchLineups.id, id))
        .returning();
      return updatedLineup;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // Team Lineup methods
  async getTeamLineup(teamId: number): Promise<TeamLineup | undefined> {
    try {
      const [lineup] = await db.select()
        .from(teamLineups)
        .where(eq(teamLineups.teamId, teamId));
      return lineup;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async createTeamLineup(lineupData: InsertTeamLineup): Promise<TeamLineup> {
    try {
      const [lineup] = await db.insert(teamLineups)
        .values(lineupData)
        .returning();
      return lineup;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async updateTeamLineup(id: number, lineupData: Partial<TeamLineup>): Promise<TeamLineup | undefined> {
    try {
      const [updatedLineup] = await db.update(teamLineups)
        .set(lineupData)
        .where(eq(teamLineups.id, id))
        .returning();
      return updatedLineup;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // Match Substitution methods
  async getMatchSubstitutions(matchId: number): Promise<MatchSubstitution[]> {
    try {
      return await db.select()
        .from(matchSubstitutions)
        .where(eq(matchSubstitutions.matchId, matchId))
        .orderBy(matchSubstitutions.minute);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async createMatchSubstitution(substitutionData: InsertMatchSubstitution): Promise<MatchSubstitution> {
    try {
      const [substitution] = await db.insert(matchSubstitutions)
        .values(substitutionData)
        .returning();
      return substitution;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async updateMatchSubstitution(id: number, substitutionData: Partial<MatchSubstitution>): Promise<MatchSubstitution | undefined> {
    try {
      const [updatedSubstitution] = await db.update(matchSubstitutions)
        .set(substitutionData)
        .where(eq(matchSubstitutions.id, id))
        .returning();
      return updatedSubstitution;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async deleteMatchSubstitution(id: number): Promise<boolean> {
    try {
      const [deletedSubstitution] = await db.delete(matchSubstitutions)
        .where(eq(matchSubstitutions.id, id))
        .returning();
      return !!deletedSubstitution;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // Match Goal methods
  async getMatchGoals(matchId: number): Promise<MatchGoal[]> {
    try {
      return await db.select()
        .from(matchGoals)
        .where(eq(matchGoals.matchId, matchId))
        .orderBy(matchGoals.minute);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async createMatchGoal(goalData: InsertMatchGoal): Promise<MatchGoal> {
    try {
      const [goal] = await db.insert(matchGoals)
        .values(goalData)
        .returning();
      return goal;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async updateMatchGoal(id: number, goalData: Partial<MatchGoal>): Promise<MatchGoal | undefined> {
    try {
      const [updatedGoal] = await db.update(matchGoals)
        .set(goalData)
        .where(eq(matchGoals.id, id))
        .returning();
      return updatedGoal;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async deleteMatchGoal(id: number): Promise<boolean> {
    try {
      const [deletedGoal] = await db.delete(matchGoals)
        .where(eq(matchGoals.id, id))
        .returning();
      return !!deletedGoal;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // Match Card methods
  async getMatchCards(matchId: number): Promise<MatchCard[]> {
    try {
      return await db.select()
        .from(matchCards)
        .where(eq(matchCards.matchId, matchId))
        .orderBy(matchCards.minute);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async createMatchCard(cardData: InsertMatchCard): Promise<MatchCard> {
    try {
      const [card] = await db.insert(matchCards)
        .values(cardData)
        .returning();
      return card;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async updateMatchCard(id: number, cardData: Partial<MatchCard>): Promise<MatchCard | undefined> {
    try {
      const [updatedCard] = await db.update(matchCards)
        .set(cardData)
        .where(eq(matchCards.id, id))
        .returning();
      return updatedCard;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async deleteMatchCard(id: number): Promise<boolean> {
    try {
      const [deletedCard] = await db.delete(matchCards)
        .where(eq(matchCards.id, id))
        .returning();
      return !!deletedCard;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // Match Photo methods
  async getMatchPhoto(id: number): Promise<MatchPhoto | undefined> {
    try {
      const [photo] = await db.select()
        .from(matchPhotos)
        .where(eq(matchPhotos.id, id));
      return photo;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getMatchPhotos(matchId: number): Promise<MatchPhoto[]> {
    try {
      return await db.select()
        .from(matchPhotos)
        .where(eq(matchPhotos.matchId, matchId))
        .orderBy(desc(matchPhotos.uploadedAt));
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async createMatchPhoto(photoData: InsertMatchPhoto): Promise<MatchPhoto> {
    try {
      const [photo] = await db.insert(matchPhotos)
        .values(photoData)
        .returning();
      return photo;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async updateMatchPhoto(id: number, photoData: Partial<MatchPhoto>): Promise<MatchPhoto | undefined> {
    try {
      const [updatedPhoto] = await db.update(matchPhotos)
        .set(photoData)
        .where(eq(matchPhotos.id, id))
        .returning();
      return updatedPhoto;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async deleteMatchPhoto(id: number): Promise<boolean> {
    try {
      const [deletedPhoto] = await db.delete(matchPhotos)
        .where(eq(matchPhotos.id, id))
        .returning();
      return !!deletedPhoto;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // League Classification methods
  async getLeagueClassifications(teamId: number): Promise<LeagueClassification[]> {
    try {
      return await db.select()
        .from(leagueClassification)
        .where(eq(leagueClassification.teamId, teamId))
        .orderBy(leagueClassification.position);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getLeagueClassification(id: number): Promise<LeagueClassification | undefined> {
    try {
      const [classification] = await db.select()
        .from(leagueClassification)
        .where(eq(leagueClassification.id, id));
      return classification;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async createLeagueClassification(classificationData: InsertLeagueClassification): Promise<LeagueClassification> {
    try {
      const [classification] = await db.insert(leagueClassification)
        .values(classificationData)
        .returning();
      return classification;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async updateLeagueClassification(id: number, classificationData: Partial<LeagueClassification>): Promise<LeagueClassification | undefined> {
    try {
      const [updatedClassification] = await db.update(leagueClassification)
        .set(classificationData)
        .where(eq(leagueClassification.id, id))
        .returning();
      return updatedClassification;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async deleteLeagueClassification(id: number): Promise<boolean> {
    try {
      const [deletedClassification] = await db.delete(leagueClassification)
        .where(eq(leagueClassification.id, id))
        .returning();
      return !!deletedClassification;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async bulkCreateLeagueClassifications(classificationsData: InsertLeagueClassification[]): Promise<LeagueClassification[]> {
    try {
      return await db.insert(leagueClassification)
        .values(classificationsData)
        .returning();
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async deleteAllTeamClassifications(teamId: number): Promise<boolean> {
    try {
      const deletedClassifications = await db.delete(leagueClassification)
        .where(eq(leagueClassification.teamId, teamId))
        .returning();
      return deletedClassifications.length > 0;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // Classification API methods that delegate to the League Classification methods
  async getTeamClassifications(teamId: number): Promise<LeagueClassification[]> {
    return this.getLeagueClassifications(teamId);
  }

  async findClassificationById(id: number): Promise<LeagueClassification | undefined> {
    return this.getLeagueClassification(id);
  }

  async createClassification(teamId: number, classificationData: Partial<InsertLeagueClassification>): Promise<LeagueClassification> {
    const fullData = {
      ...classificationData,
      teamId,
    } as InsertLeagueClassification;
    
    return this.createLeagueClassification(fullData);
  }

  async updateClassification(id: number, classificationData: Partial<LeagueClassification>): Promise<LeagueClassification | undefined> {
    return this.updateLeagueClassification(id, classificationData);
  }

  async deleteClassification(id: number): Promise<boolean> {
    return this.deleteLeagueClassification(id);
  }
}