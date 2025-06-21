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
import { eq, and, or, desc, lte, gte, sql } from "drizzle-orm";
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

  async getUserById(id: number): Promise<User | undefined> {
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
    try {
      // Use a transaction to ensure all deletions succeed or fail together
      await db.transaction(async (tx) => {
        // 1. Delete all related data in the correct order to avoid foreign key violations
        
        // Delete match-related data first
        const teamMatches = await tx
          .select({ id: matches.id })
          .from(matches)
          .where(eq(matches.teamId, id));
        
        for (const match of teamMatches) {
          // Delete match photos
          await tx.delete(matchPhotos).where(eq(matchPhotos.matchId, match.id));
          
          // Delete match cards
          await tx.delete(matchCards).where(eq(matchCards.matchId, match.id));
          
          // Delete match goals
          await tx.delete(matchGoals).where(eq(matchGoals.matchId, match.id));
          
          // Delete match substitutions
          await tx.delete(matchSubstitutions).where(eq(matchSubstitutions.matchId, match.id));
          
          // Delete match lineups
          await tx.delete(matchLineups).where(eq(matchLineups.matchId, match.id));
          
          // Delete player stats for this match
          await tx.delete(playerStats).where(eq(playerStats.matchId, match.id));
        }
        
        // Delete matches
        await tx.delete(matches).where(eq(matches.teamId, id));
        
        // Delete events and their attendance
        const teamEvents = await tx
          .select({ id: events.id })
          .from(events)
          .where(eq(events.teamId, id));
        
        for (const event of teamEvents) {
          await tx.delete(attendance).where(eq(attendance.eventId, event.id));
        }
        
        await tx.delete(events).where(eq(events.teamId, id));
        
        // Delete team-specific data
        await tx.delete(announcements).where(eq(announcements.teamId, id));
        await tx.delete(invitations).where(eq(invitations.teamId, id));
        await tx.delete(leagueClassification).where(eq(leagueClassification.teamId, id));
        await tx.delete(teamLineups).where(eq(teamLineups.teamId, id));
        
        // Delete member claims
        await tx.delete(memberClaims).where(eq(memberClaims.teamId, id));
        
        // Delete team users (join associations)
        await tx.delete(teamUsers).where(eq(teamUsers.teamId, id));
        
        // Delete team members
        await tx.delete(teamMembers).where(eq(teamMembers.teamId, id));
        
        // Finally, delete the team itself
        await tx.delete(teams).where(eq(teams.id, id));
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting team:', error);
      return false;
    }
  }

  // TeamMember methods
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.isActive, true)
        )
      );
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
        // Get the user information
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId));

        if (user) {
          // Create a virtual team member with appropriate role
          // Map user roles to team member roles correctly
          let teamRole: 'admin' | 'coach' | 'player' | 'colaborador' = 'player';

          if (user.role === 'admin' || user.role === 'superuser') {
            teamRole = 'admin';
          } else if (user.role === 'coach') {
            teamRole = 'coach';
          } else if (user.role === 'colaborador') {
            teamRole = 'colaborador';
          }

          return {
            id: -1, // Virtual ID
            teamId,
            userId,
            fullName: user.fullName || '',
            profilePicture: user.profilePicture || '',
            position: user.position || '',
            role: teamRole,
            jerseyNumber: user.jerseyNumber,
            isVerified: true,
            createdAt: teamUser.joinedAt,
            createdById: userId
          };
        }
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
          jerseyNumber: user.jerseyNumber,
          isVerified: true,
          createdAt: new Date(),
          createdById: userId
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
        // Get user info for team creator
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId));

        if (user) {
          return {
            id: -2, // Virtual ID
            teamId: teamId,
            userId: userId,
            fullName: user.fullName || '',
            profilePicture: user.profilePicture || '',
            position: user.position || '',
            role: 'admin',
            jerseyNumber: user.jerseyNumber,
            isVerified: true,
            createdAt: new Date(),
            createdById: userId
          };
        }
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
      .where(
        and(
          eq(teamMembers.userId, userId),
          eq(teamMembers.isActive, true)
        )
      );
  }

  async getTeamMemberByUserId(teamId: number, userId: number): Promise<TeamMember | undefined> {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId),
          eq(teamMembers.isActive, true)
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
          eq(teamMembers.isVerified, true),
          eq(teamMembers.isActive, true)
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
    try {
      // Start a transaction to ensure data integrity
      await db.transaction(async (tx) => {
        // 1. Soft delete: mark the member as inactive and set deletion timestamp
        await tx
          .update(teamMembers)
          .set({ 
            isActive: false,
            deletedAt: new Date()
          })
          .where(eq(teamMembers.id, id));

        // 2. Clean up match lineups - remove the deleted member from lineup arrays and position mappings
        const lineups = await tx
          .select()
          .from(matchLineups)
          .where(sql`${id} = ANY(player_ids) OR ${id} = ANY(bench_player_ids)`);

        for (const lineup of lineups) {
          // Remove member from playerIds array
          const updatedPlayerIds = (lineup.playerIds || []).filter(playerId => playerId !== id);
          
          // Remove member from benchPlayerIds array
          const updatedBenchPlayerIds = (lineup.benchPlayerIds || []).filter(playerId => playerId !== id);
          
          // Remove member from position mapping
          const positionMapping = (lineup.positionMapping as any) || {};
          const updatedPositionMapping = { ...positionMapping };
          
          // Find and remove positions that reference the deleted member
          for (const [position, playerId] of Object.entries(updatedPositionMapping)) {
            if (playerId === id) {
              delete updatedPositionMapping[position];
            }
          }

          // Update the lineup with cleaned data
          await tx
            .update(matchLineups)
            .set({
              playerIds: updatedPlayerIds,
              benchPlayerIds: updatedBenchPlayerIds,
              positionMapping: updatedPositionMapping,
              updatedAt: new Date()
            })
            .where(eq(matchLineups.id, lineup.id));
        }

        // 3. Also clean up team lineups if they reference the deleted member
        const teamLineup = await tx
          .select()
          .from(teamLineups)
          .where(eq(teamLineups.teamId, (await tx.select({ teamId: teamMembers.teamId }).from(teamMembers).where(eq(teamMembers.id, id)).limit(1))[0]?.teamId || 0));

        for (const lineup of teamLineup) {
          const positionMapping = (lineup.positionMapping as any) || {};
          const updatedPositionMapping = { ...positionMapping };
          
          // Find and remove positions that reference the deleted member
          for (const [position, playerId] of Object.entries(updatedPositionMapping)) {
            if (playerId === id) {
              delete updatedPositionMapping[position];
            }
          }

          // Update the team lineup with cleaned data
          await tx
            .update(teamLineups)
            .set({
              positionMapping: updatedPositionMapping,
              updatedAt: new Date()
            })
            .where(eq(teamLineups.id, lineup.id));
        }
      });

      return true;
    } catch (error) {
      console.error('Error soft deleting team member:', error);
      return false;
    }
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
    // Delete all related records first to avoid foreign key constraint violations
    await db.delete(matchLineups).where(eq(matchLineups.matchId, id));
    await db.delete(matchSubstitutions).where(eq(matchSubstitutions.matchId, id));
    await db.delete(matchGoals).where(eq(matchGoals.matchId, id));
    await db.delete(matchCards).where(eq(matchCards.matchId, id));
    await db.delete(matchPhotos).where(eq(matchPhotos.matchId, id));
    await db.delete(playerStats).where(eq(playerStats.matchId, id));

    // Finally delete the match itself
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
    try {
      console.log("Database storage: creating event with data:", JSON.stringify(eventData, null, 2));

      const [event] = await db
        .insert(events)
        .values(eventData)
        .returning();

      return event;
    } catch (error) {
      console.error("Error in database storage createEvent:", error);
      throw error;
    }
  }

  async updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined> {
    try {
      console.log("Database storage: updating event with data:", JSON.stringify(eventData, null, 2));

      // Convert any string dates to Date objects
      const formattedData = { ...eventData };
      if (typeof formattedData.startTime === 'string') {
        formattedData.startTime = new Date(formattedData.startTime);
      }
      if (typeof formattedData.endTime === 'string') {
        formattedData.endTime = formattedData.endTime ? new Date(formattedData.endTime) : null;
      }

      const [updatedEvent] = await db
        .update(events)
        .set(formattedData)
        .where(eq(events.id, id))
        .returning();

      return updatedEvent;
    } catch (error) {
      console.error(`Error in database storage updateEvent for event ${id}:`, error);
      throw error;
    }
  }

  async deleteEvent(id: number): Promise<boolean> {
    try {
      console.log(`Database storage: deleting event with ID ${id}`);

      // Check if the event exists first
      const existingEvent = await db
        .select()
        .from(events)
        .where(eq(events.id, id))
        .limit(1);

      if (existingEvent.length === 0) {
        console.error(`Event with ID ${id} not found for deletion`);
        return false;
      }

      // Delete the event
      const result = await db
        .delete(events)
        .where(eq(events.id, id));

      console.log(`Deletion result:`, result);
      return true;
    } catch (error) {
      console.error(`Error in database storage deleteEvent for event ${id}:`, error);
      throw error;
    }
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
    try {
      console.log("Getting match lineup for match:", matchId);
      const [lineup] = await db
        .select({
          id: matchLineups.id,
          matchId: matchLineups.matchId,
          teamId: matchLineups.teamId,
          playerIds: matchLineups.playerIds,
          benchPlayerIds: matchLineups.benchPlayerIds,
          formation: matchLineups.formation,
          positionMapping: matchLineups.positionMapping,
          createdAt: matchLineups.createdAt
          // Note: updatedAt is in the schema but not in the database table
        })
        .from(matchLineups)
        .where(eq(matchLineups.matchId, matchId));

      if (!lineup) {
        console.log("No lineup found for match:", matchId);
        return undefined;
      }

      const parsedLineup: MatchLineup = {
        ...lineup,
        playerIds: typeof lineup.playerIds === 'string' ? JSON.parse(lineup.playerIds) : lineup.playerIds,
        benchPlayerIds: typeof lineup.benchPlayerIds === 'string' ? JSON.parse(lineup.benchPlayerIds) : lineup.benchPlayerIds,
        positionMapping: typeof lineup.positionMapping === 'string' ? JSON.parse(lineup.positionMapping) : lineup.positionMapping,
        updatedAt: new Date() // Providing a default value
      };
      console.log("Retrieved and parsed lineup:", parsedLineup);
      return parsedLineup;
    } catch (error) {
      console.error("Error retrieving match lineup:", error);
      return undefined;
    }
  }

  async createMatchLineup(lineupData: InsertMatchLineup): Promise<MatchLineup> {
    try {
      // Add timestamp fields
      const now = new Date();
      const dataWithTimestamps = {
        ...lineupData,
        createdAt: now
      };
      console.log("Creating match lineup with data:", dataWithTimestamps);

      const [lineup] = await db
        .insert(matchLineups)
        .values(dataWithTimestamps)
        .returning();

      // Add the updatedAt field to satisfy the TypeScript type
      const result: MatchLineup = {
        ...lineup,
        updatedAt: now
      };

      console.log("Created match lineup:", result);

      return result;
    } catch (error) {
      console.error("Error creating match lineup:", error);
      throw error;
    }
  }

  async updateMatchLineup(id: number, lineupData: Partial<MatchLineup>): Promise<MatchLineup | undefined> {
    try {
      // Ensure we don't try to update fields that don't exist in the database
      const { updatedAt, ...validData } = lineupData;

      const [updatedLineup] = await db
        .update(matchLineups)
        .set(validData)
        .where(eq(matchLineups.id, id))
        .returning();

      if (updatedLineup) {
        // Add the updatedAt field to satisfy the TypeScript type
        return {
          ...updatedLineup,
          updatedAt: updatedLineup.createdAt // Use createdAt as a substitute since updatedAt doesn't exist
        };
      }

      return undefined;
    } catch (error) {
      console.error("Error updating match lineup:", error);
      return undefined;
    }
  }

  // Team Lineup methods
  async getTeamLineup(teamId: number): Promise<TeamLineup | undefined> {
    try {
      // Only select columns that actually exist in the database
      const [lineup] = await db
        .select({
          id: teamLineups.id,
          teamId: teamLineups.teamId,
          formation: teamLineups.formation,
          positionMapping: teamLineups.positionMapping,
          createdAt: teamLineups.createdAt,
          updatedAt: teamLineups.updatedAt
        })
        .from(teamLineups)
        .where(eq(teamLineups.teamId, teamId));

      return lineup;
    } catch (error) {
      console.error("Error retrieving team lineup:", error);
      return undefined;
    }
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
    try {
      // Use a simpler select without specifying columns to avoid schema mismatch issues
      const subs = await db
        .select()
        .from(matchSubstitutions)
        .where(eq(matchSubstitutions.matchId, matchId))
        .orderBy(matchSubstitutions.minute);

      return subs;
    } catch (error) {
      console.error("Error retrieving match substitutions:", error);
      // Return empty array instead of throwing an error
      return [];
    }
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
    try {
      // Only select fields that actually exist in the database
      const goals = await db
        .select({
          id: matchGoals.id,
          matchId: matchGoals.matchId,
          scorerId: matchGoals.scorerId,
          assistId: matchGoals.assistId,
          minute: matchGoals.minute,
          isOwnGoal: matchGoals.isOwnGoal,
          isPenalty: matchGoals.isPenalty,
          createdAt: matchGoals.createdAt
        })
        .from(matchGoals)
        .where(eq(matchGoals.matchId, matchId))
        .orderBy(matchGoals.minute);

      return goals;
    } catch (error) {
      console.error("Error retrieving match goals:", error);
      return [];
    }
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
    try {
      // Only select fields that actually exist in the database
      const cards = await db
        .select()
        .from(matchCards)
        .where(eq(matchCards.matchId, matchId))
        .orderBy(matchCards.minute);

      return cards;
    } catch (error) {
      console.error("Error retrieving match cards:", error);
      return [];
    }
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
    try {
      // Use specific column selection to avoid the "column season does not exist" error
      return db
        .select({
          id: leagueClassification.id,
          teamId: leagueClassification.teamId,
          seasonId: leagueClassification.seasonId,
          externalTeamName: leagueClassification.externalTeamName,
          position: leagueClassification.position,
          gamesPlayed: leagueClassification.gamesPlayed,
          gamesWon: leagueClassification.gamesWon,
          gamesDrawn: leagueClassification.gamesDrawn,
          gamesLost: leagueClassification.gamesLost,
          goalsFor: leagueClassification.goalsFor,
          goalsAgainst: leagueClassification.goalsAgainst,
          points: leagueClassification.points,
          createdAt: leagueClassification.createdAt,
          updatedAt: leagueClassification.updatedAt
        })
        .from(leagueClassification)
        .where(eq(leagueClassification.teamId, teamId))
        .orderBy(leagueClassification.position);
    } catch (error) {
      console.error("Error retrieving league classifications:", error);
      return [];
    }
  }

  async getLeagueClassification(id: number): Promise<LeagueClassification | undefined> {
    const [classification] = await db
      .select({
        id: leagueClassification.id,
        teamId: leagueClassification.teamId,
        seasonId: leagueClassification.seasonId,
        externalTeamName: leagueClassification.externalTeamName,
        position: leagueClassification.position,
        gamesPlayed: leagueClassification.gamesPlayed,
        gamesWon: leagueClassification.gamesWon,
        gamesDrawn: leagueClassification.gamesDrawn,
        gamesLost: leagueClassification.gamesLost,
        goalsFor: leagueClassification.goalsFor,
        goalsAgainst: leagueClassification.goalsAgainst,
        points: leagueClassification.points,
        createdAt: leagueClassification.createdAt,
        updatedAt: leagueClassification.updatedAt
      })
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

  async getActiveSeason(teamId: number): Promise<Season | undefined> {
    const [season] = await db
      .select()
      .from(seasons)
      .where(
        and(
          eq(seasons.teamId, teamId),
          eq(seasons.isActive, true)
        )
      )
      .limit(1);
    return season;
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

  async deactivateAllSeasons(teamId: number): Promise<void> {
    await db
      .update(seasons)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(seasons.teamId, teamId),
          eq(seasons.isActive, true)
        )
      );
  }

  async getMatchesBySeason(seasonId: number): Promise<Match[]> {
    return db
      .select()
      .from(matches)
      .where(eq(matches.seasonId, seasonId))
      .orderBy(desc(matches.matchDate));
  }

  async getSeasonStats(seasonId: number): Promise<any> {
    // Get matches for this season
    const seasonMatches = await this.getMatchesBySeason(seasonId);
    
    const stats = {
      totalMatches: seasonMatches.length,
      completedMatches: seasonMatches.filter(m => m.status === 'completed').length,
      scheduledMatches: seasonMatches.filter(m => m.status === 'scheduled').length,
      cancelledMatches: seasonMatches.filter(m => m.status === 'cancelled').length,
      totalGoalsScored: seasonMatches.reduce((sum, m) => sum + (m.goalsScored || 0), 0),
      totalGoalsConceded: seasonMatches.reduce((sum, m) => sum + (m.goalsConceded || 0), 0),
      wins: seasonMatches.filter(m => m.status === 'completed' && (m.goalsScored || 0) > (m.goalsConceded || 0)).length,
      draws: seasonMatches.filter(m => m.status === 'completed' && (m.goalsScored || 0) === (m.goalsConceded || 0)).length,
      losses: seasonMatches.filter(m => m.status === 'completed' && (m.goalsScored || 0) < (m.goalsConceded || 0)).length,
    };

    return stats;
  }

  // Enhanced League Classification methods
  async getLeagueClassificationsBySeason(teamId: number, seasonId: number): Promise<LeagueClassification[]> {
    try {
      // Use specific column selection to avoid the "column season does not exist" error
      return db
        .select({
          id: leagueClassification.id,
          teamId: leagueClassification.teamId,
          seasonId: leagueClassification.seasonId,
          externalTeamName: leagueClassification.externalTeamName,
          position: leagueClassification.position,
          gamesPlayed: leagueClassification.gamesPlayed,
          gamesWon: leagueClassification.gamesWon,
          gamesDrawn: leagueClassification.gamesDrawn,
          gamesLost: leagueClassification.gamesLost,
          goalsFor: leagueClassification.goalsFor,
          goalsAgainst: leagueClassification.goalsAgainst,
          points: leagueClassification.points,
          createdAt: leagueClassification.createdAt,
          updatedAt: leagueClassification.updatedAt
        })
        .from(leagueClassification)
        .where(
          and(
            eq(leagueClassification.teamId, teamId),
            eq(leagueClassification.seasonId, seasonId)
          )
        )
        .orderBy(leagueClassification.position);
    } catch (error) {
      console.error("Error retrieving league classifications by season:", error);
      return [];
    }
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