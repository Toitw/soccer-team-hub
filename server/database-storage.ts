import {
  type User, type InsertUser, users,
  type Team, type InsertTeam, teams,
  type TeamMember, type InsertTeamMember, teamMembers,
  type TeamUser, type InsertTeamUser, teamUsers,
  type MemberClaim, type InsertMemberClaim, memberClaims,
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
  type LeagueClassification, type InsertLeagueClassification, leagueClassification,
  type Season, type InsertSeason, seasons,
  type Feedback, type InsertFeedback, feedback
} from "@shared/schema";
import { db, pool } from "./db";
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
    try {
      console.log(`Getting teams for user ID: ${userId}`);
      
      // Find all team memberships for this user from teamUsers table
      const userTeams = await db
        .select()
        .from(teamUsers)
        .where(eq(teamUsers.userId, userId));
      
      console.log(`Found ${userTeams.length} team associations for user ${userId}`);
      
      // Get all teams for these memberships
      const teamIds = userTeams.map(tu => tu.teamId);
      
      if (teamIds.length === 0) {
        console.log(`No teams found for user ${userId}`);
        return [];
      }
      
      // Use SQL IN clause to fetch all teams at once
      const result = await db
        .select()
        .from(teams)
        .where(sql`${teams.id} IN (${teamIds.join(',')})`);
      
      console.log(`Found ${result.length} teams for user ${userId}`);
      return result;
    } catch (error) {
      console.error(`Error getting teams for user ${userId}:`, error);
      // Create a basic fallback for now (will be properly migrated later)
      // This is temporary during migration
      try {
        // Try the old method as fallback during migration
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
          .where(sql`${teams.id} IN (${teamIds.join(',')})`);
      } catch (fallbackError) {
        console.error(`Fallback method also failed:`, fallbackError);
        return [];
      }
    }
  }

  async getTeamByJoinCode(joinCode: string): Promise<Team | undefined> {
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.joinCode, joinCode));
    
    return team;
  }

  async createTeam(teamData: InsertTeam): Promise<Team> {
    try {
      // Check if teamData contains createdById
      if (!teamData.createdById) {
        throw new Error("createdById is required for team creation");
      }
      
      // Convert Drizzle ORM insert to raw SQL to set owner_id explicitly
      const query = `
        INSERT INTO teams (
          name, logo, division, season_year, 
          category, team_type, created_by_id, join_code, 
          owner_id
        ) VALUES (
          $1, $2, $3, $4, 
          $5, $6, $7, $8,
          $9
        ) RETURNING *
      `;
      
      const values = [
        teamData.name,
        teamData.logo || null,
        teamData.division || null,
        teamData.seasonYear || null,
        teamData.category || null,
        teamData.teamType || null,
        teamData.createdById,
        teamData.joinCode,
        teamData.createdById // Set owner_id to createdById
      ];
      
      console.log("Executing SQL with values:", values);
      
      // Use the pool directly for this query
      const result = await pool.query(query, values);
      
      if (result.rows && result.rows.length > 0) {
        return result.rows[0];
      } else {
        throw new Error("Failed to create team: No rows returned");
      }
    } catch (error) {
      console.error("Error creating team:", error);
      throw error;
    }
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

  // Get team member by ID
  async getTeamMemberById(id: number): Promise<TeamMember | undefined> {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, id));
    
    return member;
  }
  
  // Get team member by team ID and user ID
  async getTeamMember(teamId: number, userId: number): Promise<TeamMember | undefined> {
    try {
      // First try the direct relationship
      const [member] = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, userId)
          )
        );
      
      if (member) {
        return member;
      }
      
      // If not found, check through team_users table
      const [teamUser] = await db
        .select()
        .from(teamUsers)
        .where(
          and(
            eq(teamUsers.teamId, teamId),
            eq(teamUsers.userId, userId)
          )
        );
      
      if (teamUser) {
        // If there's a team_user entry, find the corresponding team member
        const [teamMember] = await db
          .select()
          .from(teamMembers)
          .where(eq(teamMembers.id, teamUser.teamMemberId));
        
        return teamMember;
      }
      
      // Check for admin users who should have access to all teams
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
      
      if (user && (user.role === 'admin' || user.role === 'superuser')) {
        // Create a virtual team member for admin/superuser
        return {
          id: -1, // Virtual ID
          teamId: teamId,
          userId: userId,
          fullName: user.fullName || '',
          profilePicture: user.profilePicture || '',
          position: user.position || '',
          role: 'admin',
          jerseyNumber: null,
          isVerified: true,
          joinDate: new Date(),
          exitDate: null,
          notes: 'Global admin access'
        };
      }
      
      // Final check: if user created this team
      const [team] = await db
        .select()
        .from(teams)
        .where(
          and(
            eq(teams.id, teamId),
            eq(teams.createdById, userId)
          )
        );
      
      if (team) {
        // Create a virtual team member for the team creator
        return {
          id: -2, // Virtual ID
          teamId: teamId,
          userId: userId,
          fullName: '',
          profilePicture: '',
          position: '',
          role: 'admin',
          jerseyNumber: null,
          isVerified: true,
          joinDate: new Date(),
          exitDate: null,
          notes: 'Team creator'
        };
      }
      
      return undefined;
    } catch (error) {
      console.error('Error in getTeamMember:', error);
      return undefined;
    }
  }

  async getTeamMembersByUserId(userId: number): Promise<TeamMember[]> {
    return db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));
  }
  
  async getTeamMemberByUserId(teamId: number, userId: number): Promise<TeamMember | undefined> {
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
  
  async getVerifiedTeamMembers(teamId: number): Promise<TeamMember[]> {
    return db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.isVerified, true)
        )
      );
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
  
  // New method to verify a team member (link it to a user)
  async verifyTeamMember(memberId: number, userId: number): Promise<TeamMember | undefined> {
    const [updatedMember] = await db
      .update(teamMembers)
      .set({ 
        userId: userId,
        isVerified: true
      })
      .where(eq(teamMembers.id, memberId))
      .returning();
    
    return updatedMember;
  }
  
  // TeamUser methods
  async getTeamUsers(teamId: number): Promise<TeamUser[]> {
    return db
      .select()
      .from(teamUsers)
      .where(eq(teamUsers.teamId, teamId));
  }
  
  async getTeamUser(teamId: number, userId: number): Promise<TeamUser | undefined> {
    const [teamUser] = await db
      .select()
      .from(teamUsers)
      .where(
        and(
          eq(teamUsers.teamId, teamId),
          eq(teamUsers.userId, userId)
        )
      );
    
    return teamUser;
  }
  
  async getTeamUsersByUserId(userId: number): Promise<TeamUser[]> {
    return db
      .select()
      .from(teamUsers)
      .where(eq(teamUsers.userId, userId));
  }
  
  async createTeamUser(teamUserData: InsertTeamUser): Promise<TeamUser> {
    const [teamUser] = await db
      .insert(teamUsers)
      .values(teamUserData)
      .returning();
    
    return teamUser;
  }
  
  async deleteTeamUser(id: number): Promise<boolean> {
    await db.delete(teamUsers).where(eq(teamUsers.id, id));
    return true;
  }
  
  // MemberClaim methods
  async getMemberClaims(teamId: number): Promise<MemberClaim[]> {
    return db
      .select()
      .from(memberClaims)
      .where(eq(memberClaims.teamId, teamId));
  }
  
  async getMemberClaimsByStatus(teamId: number, status: string): Promise<MemberClaim[]> {
    return db
      .select()
      .from(memberClaims)
      .where(
        and(
          eq(memberClaims.teamId, teamId),
          eq(memberClaims.status, status)
        )
      );
  }
  
  async getMemberClaimById(id: number): Promise<MemberClaim | undefined> {
    const [claim] = await db
      .select()
      .from(memberClaims)
      .where(eq(memberClaims.id, id));
    
    return claim;
  }
  
  async getMemberClaimByUserAndMember(userId: number, memberId: number): Promise<MemberClaim | undefined> {
    const [claim] = await db
      .select()
      .from(memberClaims)
      .where(
        and(
          eq(memberClaims.userId, userId),
          eq(memberClaims.teamMemberId, memberId)
        )
      );
    
    return claim;
  }
  
  async createMemberClaim(claimData: InsertMemberClaim): Promise<MemberClaim> {
    const [claim] = await db
      .insert(memberClaims)
      .values(claimData)
      .returning();
    
    return claim;
  }
  
  async updateMemberClaim(id: number, claimData: Partial<MemberClaim>): Promise<MemberClaim | undefined> {
    const [updatedClaim] = await db
      .update(memberClaims)
      .set(claimData)
      .where(eq(memberClaims.id, id))
      .returning();
    
    return updatedClaim;
  }
  
  async approveMemberClaim(id: number, reviewerId: number): Promise<MemberClaim | undefined> {
    const now = new Date();
    
    const [claim] = await db
      .update(memberClaims)
      .set({
        status: "approved",
        reviewedAt: now,
        reviewedById: reviewerId
      })
      .where(eq(memberClaims.id, id))
      .returning();
      
    if (claim) {
      // When a claim is approved, update the team member to link with this user
      await this.verifyTeamMember(claim.teamMemberId, claim.userId);
    }
    
    return claim;
  }
  
  async rejectMemberClaim(id: number, reviewerId: number, reason?: string): Promise<MemberClaim | undefined> {
    const now = new Date();
    
    const [claim] = await db
      .update(memberClaims)
      .set({
        status: "rejected",
        reviewedAt: now,
        reviewedById: reviewerId,
        rejectionReason: reason || null
      })
      .where(eq(memberClaims.id, id))
      .returning();
    
    return claim;
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

  // Season methods
  async getSeasons(teamId: number): Promise<Season[]> {
    return db
      .select()
      .from(seasons)
      .where(eq(seasons.teamId, teamId))
      .orderBy(desc(seasons.startDate));
  }

  async getSeason(id: number): Promise<Season | undefined> {
    const [season] = await db
      .select()
      .from(seasons)
      .where(eq(seasons.id, id));
    
    return season;
  }

  async getActiveSeasons(teamId: number): Promise<Season[]> {
    return db
      .select()
      .from(seasons)
      .where(
        and(
          eq(seasons.teamId, teamId),
          eq(seasons.isActive, true)
        )
      );
  }

  async createSeason(seasonData: InsertSeason): Promise<Season> {
    const [season] = await db
      .insert(seasons)
      .values(seasonData)
      .returning();
    
    return season;
  }

  async updateSeason(id: number, seasonData: Partial<Season>): Promise<Season | undefined> {
    const [updatedSeason] = await db
      .update(seasons)
      .set(seasonData)
      .where(eq(seasons.id, id))
      .returning();
    
    return updatedSeason;
  }

  async deleteSeason(id: number): Promise<boolean> {
    await db.delete(seasons).where(eq(seasons.id, id));
    return true;
  }

  async finishSeason(id: number): Promise<Season | undefined> {
    const [updatedSeason] = await db
      .update(seasons)
      .set({ isActive: false })
      .where(eq(seasons.id, id))
      .returning();
    
    return updatedSeason;
  }

  // Enhanced League Classification methods
  async getLeagueClassificationsBySeason(teamId: number, seasonId: number): Promise<LeagueClassification[]> {
    return db
      .select()
      .from(leagueClassification)
      .where(
        and(
          eq(leagueClassification.teamId, teamId),
          eq(leagueClassification.seasonId, seasonId)
        )
      )
      .orderBy(leagueClassification.position);
  }

  // Feedback methods
  async getFeedback(id: number): Promise<Feedback | undefined> {
    const [result] = await db
      .select()
      .from(feedback)
      .where(eq(feedback.id, id));
    
    return result;
  }

  async getAllFeedback(): Promise<Feedback[]> {
    return db
      .select()
      .from(feedback)
      .orderBy(desc(feedback.createdAt));
  }

  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [result] = await db
      .insert(feedback)
      .values(feedbackData)
      .returning();
    
    return result;
  }
  
  async updateFeedbackStatus(id: number, status: string): Promise<Feedback | undefined> {
    // Ensure status is one of the allowed values
    if (!["pending", "reviewed", "resolved"].includes(status)) {
      throw new Error("Invalid status value");
    }
    
    const [updated] = await db
      .update(feedback)
      .set({ 
        status: status as "pending" | "reviewed" | "resolved",
        updatedAt: new Date() 
      })
      .where(eq(feedback.id, id))
      .returning();
    
    return updated;
  }
  
  async deleteFeedback(id: number): Promise<boolean> {
    await db
      .delete(feedback)
      .where(eq(feedback.id, id));
    
    return true;
  }
  
  // Member claims methods
  async getMemberClaims(teamId: number): Promise<MemberClaim[]> {
    return db
      .select()
      .from(memberClaims)
      .where(eq(memberClaims.teamId, teamId))
      .orderBy(desc(memberClaims.requestedAt));
  }
  
  async getMemberClaimsByUser(userId: number): Promise<MemberClaim[]> {
    return db
      .select()
      .from(memberClaims)
      .where(eq(memberClaims.userId, userId))
      .orderBy(desc(memberClaims.requestedAt));
  }
  
  async getMemberClaimById(id: number): Promise<MemberClaim | undefined> {
    const [claim] = await db
      .select()
      .from(memberClaims)
      .where(eq(memberClaims.id, id));
    return claim;
  }
  
  async createMemberClaim(claimData: InsertMemberClaim): Promise<MemberClaim> {
    const [claim] = await db
      .insert(memberClaims)
      .values(claimData)
      .returning();
    return claim;
  }
  
  async updateMemberClaim(id: number, data: Partial<MemberClaim>): Promise<MemberClaim | undefined> {
    const [updated] = await db
      .update(memberClaims)
      .set(data)
      .where(eq(memberClaims.id, id))
      .returning();
    return updated;
  }
  
  async deleteMemberClaim(id: number): Promise<boolean> {
    const deleted = await db
      .delete(memberClaims)
      .where(eq(memberClaims.id, id));
    return deleted.rowCount > 0;
  }
}