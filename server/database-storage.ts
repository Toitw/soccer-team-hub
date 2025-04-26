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
import { PostgresError } from "postgres";
import { sessionStore } from "./session";

/**
 * Database storage implementation using Drizzle ORM
 */
export class DatabaseStorage implements IStorage {
  // Use our persistent Postgres session store instead of MemoryStore
  sessionStore = sessionStore;

  constructor() {
    // Session store is already initialized in session.ts
  }

  /**
   * Check for integrity constraint violations and return appropriate error
   * Returns 409 Conflict for integrity constraint violations
   */
  private handleDatabaseError(error: any): never {
    console.error('Database error:', error);
    
    // Check if it's a Postgres error with a code
    if (error.code) {
      if (error.code === '23505') { // Unique violation
        let message = "Duplicate entry detected";
        
        // Extract more info from the constraint name if available
        if (error.constraint) {
          if (error.constraint.includes('username')) {
            message = "Username already exists";
          } else if (error.constraint.includes('email')) {
            message = "Email already exists";
          } else if (error.constraint.includes('join_code')) {
            message = "Team join code already exists";
          }
        }
        
        const err = new Error(message);
        err.name = "UniqueViolationError";
        (err as any).status = 409;
        throw err;
      } else if (error.code === '23503') { // Foreign key violation
        let message = "Referenced record does not exist";
        
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

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
      return user;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
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
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning({ id: users.id });
      return result.length > 0;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // The rest of the implementation remains unchanged...
  // Add other method implementations here following the interface
  
  // Team management
  async getTeam(id: number): Promise<Team | undefined> {
    try {
      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, id));
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
      // Get team IDs where the user is a member
      const memberTeams = await db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId));
      
      // Get the team details for those IDs
      if (memberTeams.length === 0) {
        return [];
      }
      
      // Create an array of conditions for each team ID
      const teamIdConditions = memberTeams.map(t => eq(teams.id, t.teamId));
      
      // Use OR to combine all conditions
      return await db
        .select()
        .from(teams)
        .where(or(...teamIdConditions));
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getTeamByJoinCode(joinCode: string): Promise<Team | undefined> {
    try {
      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.joinCode, joinCode));
      return team;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async createTeam(teamData: InsertTeam): Promise<Team> {
    try {
      const [team] = await db
        .insert(teams)
        .values(teamData)
        .returning();
      return team;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async updateTeam(id: number, teamData: Partial<Team>): Promise<Team | undefined> {
    try {
      const [updatedTeam] = await db
        .update(teams)
        .set({
          ...teamData,
          updatedAt: new Date()
        })
        .where(eq(teams.id, id))
        .returning();
      return updatedTeam;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async deleteTeam(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(teams)
        .where(eq(teams.id, id))
        .returning({ id: teams.id });
      return result.length > 0;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // Add the rest of the implementations as needed for your application...
  // For brevity, I've only included the core user and team methods
  // Since we're inheriting from BaseEntityStorage, we don't need to reimplement all methods
  // unless you want to override them with custom database logic

  // These methods will be required to implement the IStorage interface
  // Follow the pattern above for each method
  
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    // Implement based on your database schema
    try {
      return await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId));
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getTeamMember(teamId: number, userId: number): Promise<TeamMember | undefined> {
    try {
      const [member] = await db
        .select()
        .from(teamMembers)
        .where(and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId)
        ));
      return member;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getTeamMembersByUserId(userId: number): Promise<TeamMember[]> {
    try {
      return await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId));
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async createTeamMember(teamMemberData: InsertTeamMember): Promise<TeamMember> {
    try {
      const [member] = await db
        .insert(teamMembers)
        .values(teamMemberData)
        .returning();
      return member;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async updateTeamMember(id: number, teamMemberData: Partial<TeamMember>): Promise<TeamMember | undefined> {
    try {
      const [updatedMember] = await db
        .update(teamMembers)
        .set({
          ...teamMemberData,
          updatedAt: new Date()
        })
        .where(eq(teamMembers.id, id))
        .returning();
      return updatedMember;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(teamMembers)
        .where(eq(teamMembers.id, id))
        .returning({ id: teamMembers.id });
      return result.length > 0;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  // The rest of the methods for the IStorage interface would be implemented here
  // For brevity, I've omitted them but they would follow similar patterns

  // Placeholder methods to satisfy TypeScript - these would need actual implementations
  async getMatch(id: number): Promise<Match | undefined> { return undefined; }
  async getMatches(teamId: number): Promise<Match[]> { return []; }
  async getRecentMatches(teamId: number, limit: number): Promise<Match[]> { return []; }
  async createMatch(matchData: InsertMatch): Promise<Match> { return {} as Match; }
  async updateMatch(id: number, matchData: Partial<Match>): Promise<Match | undefined> { return undefined; }
  
  async getEvent(id: number): Promise<Event | undefined> { return undefined; }
  async getEvents(teamId: number): Promise<Event[]> { return []; }
  async getUpcomingEvents(teamId: number, limit: number): Promise<Event[]> { return []; }
  async createEvent(eventData: InsertEvent): Promise<Event> { return {} as Event; }
  async updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined> { return undefined; }
  async deleteEvent(id: number): Promise<boolean> { return false; }
  
  async getAttendance(eventId: number): Promise<Attendance[]> { return []; }
  async getUserAttendance(userId: number): Promise<Attendance[]> { return []; }
  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> { return {} as Attendance; }
  async updateAttendance(id: number, attendanceData: Partial<Attendance>): Promise<Attendance | undefined> { return undefined; }
  
  async getPlayerStats(userId: number): Promise<PlayerStat[]> { return []; }
  async getMatchPlayerStats(matchId: number): Promise<PlayerStat[]> { return []; }
  async createPlayerStat(playerStatData: InsertPlayerStat): Promise<PlayerStat> { return {} as PlayerStat; }
  async updatePlayerStat(id: number, playerStatData: Partial<PlayerStat>): Promise<PlayerStat | undefined> { return undefined; }
  
  async getAnnouncement(id: number): Promise<Announcement | undefined> { return undefined; }
  async getAnnouncements(teamId: number): Promise<Announcement[]> { return []; }
  async getRecentAnnouncements(teamId: number, limit: number): Promise<Announcement[]> { return []; }
  async createAnnouncement(announcementData: InsertAnnouncement): Promise<Announcement> { return {} as Announcement; }
  async updateAnnouncement(id: number, announcementData: Partial<Announcement>): Promise<Announcement | undefined> { return undefined; }
  async deleteAnnouncement(id: number): Promise<boolean> { return false; }
  
  async getInvitation(id: number): Promise<Invitation | undefined> { return undefined; }
  async getInvitations(teamId: number): Promise<Invitation[]> { return []; }
  async createInvitation(invitationData: InsertInvitation): Promise<Invitation> { return {} as Invitation; }
  async updateInvitation(id: number, invitationData: Partial<Invitation>): Promise<Invitation | undefined> { return undefined; }
  
  async getMatchLineup(matchId: number): Promise<MatchLineup | undefined> { return undefined; }
  async createMatchLineup(lineupData: InsertMatchLineup): Promise<MatchLineup> { return {} as MatchLineup; }
  async updateMatchLineup(id: number, lineupData: Partial<MatchLineup>): Promise<MatchLineup | undefined> { return undefined; }
  
  async getTeamLineup(teamId: number): Promise<TeamLineup | undefined> { return undefined; }
  async createTeamLineup(lineupData: InsertTeamLineup): Promise<TeamLineup> { return {} as TeamLineup; }
  async updateTeamLineup(id: number, lineupData: Partial<TeamLineup>): Promise<TeamLineup | undefined> { return undefined; }
  
  async getMatchSubstitutions(matchId: number): Promise<MatchSubstitution[]> { return []; }
  async createMatchSubstitution(substitutionData: InsertMatchSubstitution): Promise<MatchSubstitution> { return {} as MatchSubstitution; }
  async updateMatchSubstitution(id: number, substitutionData: Partial<MatchSubstitution>): Promise<MatchSubstitution | undefined> { return undefined; }
  async deleteMatchSubstitution(id: number): Promise<boolean> { return false; }
  
  async getMatchGoals(matchId: number): Promise<MatchGoal[]> { return []; }
  async createMatchGoal(goalData: InsertMatchGoal): Promise<MatchGoal> { return {} as MatchGoal; }
  async updateMatchGoal(id: number, goalData: Partial<MatchGoal>): Promise<MatchGoal | undefined> { return undefined; }
  async deleteMatchGoal(id: number): Promise<boolean> { return false; }
  
  async getMatchCards(matchId: number): Promise<MatchCard[]> { return []; }
  async createMatchCard(cardData: InsertMatchCard): Promise<MatchCard> { return {} as MatchCard; }
  async updateMatchCard(id: number, cardData: Partial<MatchCard>): Promise<MatchCard | undefined> { return undefined; }
  async deleteMatchCard(id: number): Promise<boolean> { return false; }
  
  async getMatchPhoto(id: number): Promise<MatchPhoto | undefined> { return undefined; }
  async getMatchPhotos(matchId: number): Promise<MatchPhoto[]> { return []; }
  async createMatchPhoto(photoData: InsertMatchPhoto): Promise<MatchPhoto> { return {} as MatchPhoto; }
  async updateMatchPhoto(id: number, photoData: Partial<MatchPhoto>): Promise<MatchPhoto | undefined> { return undefined; }
  async deleteMatchPhoto(id: number): Promise<boolean> { return false; }
  
  async getLeagueClassifications(teamId: number): Promise<LeagueClassification[]> { return []; }
  async getLeagueClassification(id: number): Promise<LeagueClassification | undefined> { return undefined; }
  async createLeagueClassification(classificationData: InsertLeagueClassification): Promise<LeagueClassification> { return {} as LeagueClassification; }
  async updateLeagueClassification(id: number, classificationData: Partial<LeagueClassification>): Promise<LeagueClassification | undefined> { return undefined; }
  async deleteLeagueClassification(id: number): Promise<boolean> { return false; }
  async bulkCreateLeagueClassifications(classificationsData: InsertLeagueClassification[]): Promise<LeagueClassification[]> { return []; }
  async deleteAllTeamClassifications(teamId: number): Promise<boolean> { return false; }
  async getTeamClassifications(teamId: number): Promise<LeagueClassification[]> { return []; }
  async findClassificationById(id: number): Promise<LeagueClassification | undefined> { return undefined; }
  async createClassification(teamId: number, classificationData: Partial<InsertLeagueClassification>): Promise<LeagueClassification> { return {} as LeagueClassification; }
  async updateClassification(id: number, classificationData: Partial<LeagueClassification>): Promise<LeagueClassification | undefined> { return undefined; }
  async deleteClassification(id: number): Promise<boolean> { return false; }
}