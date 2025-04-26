import {
  users,
  teams,
  teamMembers,
  matches,
  events,
  attendance,
  playerStats,
  announcements,
  matchLineups,
  matchGoals,
  matchCards,
  matchSubstitutions,
  type InsertUser,
  type User,
  type InsertTeam,
  type Team,
  type InsertTeamMember,
  type TeamMember,
  type InsertMatch,
  type Match,
  type InsertEvent,
  type Event,
  type InsertAnnouncement,
  type Announcement,
  type InsertPlayerStat,
  type PlayerStat,
} from "@shared/schema";
import { eq, gt, and, desc, sql } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  // User methods
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  insertUser(user: Partial<User>): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;

  // Team methods
  getTeamById(id: number): Promise<Team | undefined>;
  getTeamsByUserId(userId: number): Promise<Team[]>;
  insertTeam(team: Partial<Team>): Promise<Team>;
  updateTeam(id: number, teamData: Partial<Team>): Promise<Team | undefined>;
  getTeamPlayers(teamId: number): Promise<User[]>;
  getTeamStats(teamId: number): Promise<any>;

  // Team member methods
  getTeamMember(teamId: number, userId: number): Promise<TeamMember | undefined>;
  insertTeamMember(member: Partial<TeamMember>): Promise<TeamMember>;
  updateTeamMember(id: number, memberData: Partial<TeamMember>): Promise<TeamMember | undefined>;
  removeTeamMember(teamId: number, userId: number): Promise<boolean>;

  // Match methods
  getMatchById(id: number): Promise<Match | undefined>;
  getMatchesByTeamId(teamId: number): Promise<Match[]>;
  getNextMatch(teamId: number): Promise<Match | undefined>;
  insertMatch(match: Partial<Match>): Promise<Match>;
  updateMatch(id: number, matchData: Partial<Match>): Promise<Match | undefined>;

  // Event methods
  getEventById(id: number): Promise<Event | undefined>;
  getEventsByTeamId(teamId: number): Promise<Event[]>;
  getUpcomingEvents(teamId: number): Promise<Event[]>;
  insertEvent(event: Partial<Event>): Promise<Event>;
  updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined>;

  // Announcement methods
  getAnnouncementById(id: number): Promise<Announcement | undefined>;
  getAnnouncementsByTeamId(teamId: number): Promise<Announcement[]>;
  getRecentAnnouncements(teamId: number): Promise<Announcement[]>;
  insertAnnouncement(announcement: Partial<Announcement>): Promise<Announcement>;
  updateAnnouncement(id: number, announcementData: Partial<Announcement>): Promise<Announcement | undefined>;

  // Stats methods
  getPlayerStatsByUserId(userId: number): Promise<PlayerStat[]>;
  getPlayerStatsByMatchId(matchId: number): Promise<PlayerStat[]>;
  insertPlayerStat(stat: Partial<PlayerStat>): Promise<PlayerStat>;
  updatePlayerStat(id: number, statData: Partial<PlayerStat>): Promise<PlayerStat | undefined>;
}

export class PostgresStorage implements IStorage {
  /* User methods */
  async getUserById(id: number): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id));
      return result[0];
    } catch (error) {
      console.error("Error in getUserById:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username));
      return result[0];
    } catch (error) {
      console.error("Error in getUserByUsername:", error);
      return undefined;
    }
  }

  async insertUser(userData: Partial<User>): Promise<User> {
    try {
      const result = await db.insert(users).values(userData).returning();
      return result[0];
    } catch (error) {
      console.error("Error in insertUser:", error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      const result = await db.update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error in updateUser:", error);
      return undefined;
    }
  }

  /* Team methods */
  async getTeamById(id: number): Promise<Team | undefined> {
    try {
      const result = await db.select().from(teams).where(eq(teams.id, id));
      return result[0];
    } catch (error) {
      console.error("Error in getTeamById:", error);
      return undefined;
    }
  }

  async getTeamsByUserId(userId: number): Promise<Team[]> {
    try {
      // Get user's teams through team memberships
      const result = await db.select({
        team: teams
      })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId))
      .innerJoin(teams, eq(teamMembers.teamId, teams.id));
      
      return result.map(r => r.team);
    } catch (error) {
      console.error("Error in getTeamsByUserId:", error);
      return [];
    }
  }

  async insertTeam(teamData: Partial<Team>): Promise<Team> {
    try {
      const result = await db.insert(teams).values(teamData).returning();
      return result[0];
    } catch (error) {
      console.error("Error in insertTeam:", error);
      throw error;
    }
  }

  async updateTeam(id: number, teamData: Partial<Team>): Promise<Team | undefined> {
    try {
      const result = await db.update(teams)
        .set(teamData)
        .where(eq(teams.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error in updateTeam:", error);
      return undefined;
    }
  }

  async getTeamPlayers(teamId: number): Promise<User[]> {
    try {
      const result = await db.select({
        user: users
      })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId))
      .innerJoin(users, eq(teamMembers.userId, users.id));
      
      return result.map(r => r.user);
    } catch (error) {
      console.error("Error in getTeamPlayers:", error);
      return [];
    }
  }

  async getTeamStats(teamId: number): Promise<any> {
    try {
      // Get match statistics
      const matchesResult = await db.select().from(matches).where(eq(matches.teamId, teamId));
      
      const totalMatches = matchesResult.length;
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let goalsScored = 0;
      let goalsConceded = 0;
      
      matchesResult.forEach(match => {
        if (match.goalsScored !== null && match.goalsConceded !== null) {
          goalsScored += match.goalsScored;
          goalsConceded += match.goalsConceded;
          
          if (match.goalsScored > match.goalsConceded) {
            wins++;
          } else if (match.goalsScored === match.goalsConceded) {
            draws++;
          } else {
            losses++;
          }
        }
      });
      
      return {
        totalMatches,
        wins,
        draws,
        losses,
        goalsScored,
        goalsConceded,
        goalDifference: goalsScored - goalsConceded
      };
    } catch (error) {
      console.error("Error in getTeamStats:", error);
      return {
        totalMatches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsScored: 0,
        goalsConceded: 0,
        goalDifference: 0
      };
    }
  }

  /* Team member methods */
  async getTeamMember(teamId: number, userId: number): Promise<TeamMember | undefined> {
    try {
      const result = await db.select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, userId)
          )
        );
      return result[0];
    } catch (error) {
      console.error("Error in getTeamMember:", error);
      return undefined;
    }
  }

  async insertTeamMember(memberData: Partial<TeamMember>): Promise<TeamMember> {
    try {
      const result = await db.insert(teamMembers).values(memberData).returning();
      return result[0];
    } catch (error) {
      console.error("Error in insertTeamMember:", error);
      throw error;
    }
  }

  async updateTeamMember(id: number, memberData: Partial<TeamMember>): Promise<TeamMember | undefined> {
    try {
      const result = await db.update(teamMembers)
        .set(memberData)
        .where(eq(teamMembers.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error in updateTeamMember:", error);
      return undefined;
    }
  }

  async removeTeamMember(teamId: number, userId: number): Promise<boolean> {
    try {
      await db.delete(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, userId)
          )
        );
      return true;
    } catch (error) {
      console.error("Error in removeTeamMember:", error);
      return false;
    }
  }

  /* Match methods */
  async getMatchById(id: number): Promise<Match | undefined> {
    try {
      const result = await db.select().from(matches).where(eq(matches.id, id));
      return result[0];
    } catch (error) {
      console.error("Error in getMatchById:", error);
      return undefined;
    }
  }

  async getMatchesByTeamId(teamId: number): Promise<Match[]> {
    try {
      return await db.select()
        .from(matches)
        .where(eq(matches.teamId, teamId))
        .orderBy(desc(matches.matchDate));
    } catch (error) {
      console.error("Error in getMatchesByTeamId:", error);
      return [];
    }
  }

  async getNextMatch(teamId: number): Promise<Match | undefined> {
    try {
      const now = new Date();
      const result = await db.select()
        .from(matches)
        .where(
          and(
            eq(matches.teamId, teamId),
            gt(matches.matchDate, now)
          )
        )
        .orderBy(matches.matchDate)
        .limit(1);
      return result[0];
    } catch (error) {
      console.error("Error in getNextMatch:", error);
      return undefined;
    }
  }

  async insertMatch(matchData: Partial<Match>): Promise<Match> {
    try {
      const result = await db.insert(matches).values(matchData).returning();
      return result[0];
    } catch (error) {
      console.error("Error in insertMatch:", error);
      throw error;
    }
  }

  async updateMatch(id: number, matchData: Partial<Match>): Promise<Match | undefined> {
    try {
      const result = await db.update(matches)
        .set(matchData)
        .where(eq(matches.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error in updateMatch:", error);
      return undefined;
    }
  }

  /* Event methods */
  async getEventById(id: number): Promise<Event | undefined> {
    try {
      const result = await db.select().from(events).where(eq(events.id, id));
      return result[0];
    } catch (error) {
      console.error("Error in getEventById:", error);
      return undefined;
    }
  }

  async getEventsByTeamId(teamId: number): Promise<Event[]> {
    try {
      return await db.select()
        .from(events)
        .where(eq(events.teamId, teamId))
        .orderBy(desc(events.startTime));
    } catch (error) {
      console.error("Error in getEventsByTeamId:", error);
      return [];
    }
  }

  async getUpcomingEvents(teamId: number): Promise<Event[]> {
    try {
      const now = new Date();
      return await db.select()
        .from(events)
        .where(
          and(
            eq(events.teamId, teamId),
            gt(events.startTime, now)
          )
        )
        .orderBy(events.startTime)
        .limit(5);
    } catch (error) {
      console.error("Error in getUpcomingEvents:", error);
      return [];
    }
  }

  async insertEvent(eventData: Partial<Event>): Promise<Event> {
    try {
      const result = await db.insert(events).values(eventData).returning();
      return result[0];
    } catch (error) {
      console.error("Error in insertEvent:", error);
      throw error;
    }
  }

  async updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined> {
    try {
      const result = await db.update(events)
        .set(eventData)
        .where(eq(events.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error in updateEvent:", error);
      return undefined;
    }
  }

  /* Announcement methods */
  async getAnnouncementById(id: number): Promise<Announcement | undefined> {
    try {
      const result = await db.select().from(announcements).where(eq(announcements.id, id));
      return result[0];
    } catch (error) {
      console.error("Error in getAnnouncementById:", error);
      return undefined;
    }
  }

  async getAnnouncementsByTeamId(teamId: number): Promise<Announcement[]> {
    try {
      return await db.select()
        .from(announcements)
        .where(eq(announcements.teamId, teamId))
        .orderBy(desc(announcements.createdAt));
    } catch (error) {
      console.error("Error in getAnnouncementsByTeamId:", error);
      return [];
    }
  }

  async getRecentAnnouncements(teamId: number): Promise<Announcement[]> {
    try {
      return await db.select()
        .from(announcements)
        .where(eq(announcements.teamId, teamId))
        .orderBy(desc(announcements.createdAt))
        .limit(5);
    } catch (error) {
      console.error("Error in getRecentAnnouncements:", error);
      return [];
    }
  }

  async insertAnnouncement(announcementData: Partial<Announcement>): Promise<Announcement> {
    try {
      const result = await db.insert(announcements).values(announcementData).returning();
      return result[0];
    } catch (error) {
      console.error("Error in insertAnnouncement:", error);
      throw error;
    }
  }

  async updateAnnouncement(id: number, announcementData: Partial<Announcement>): Promise<Announcement | undefined> {
    try {
      const result = await db.update(announcements)
        .set(announcementData)
        .where(eq(announcements.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error in updateAnnouncement:", error);
      return undefined;
    }
  }

  /* Stats methods */
  async getPlayerStatsByUserId(userId: number): Promise<PlayerStat[]> {
    try {
      return await db.select()
        .from(playerStats)
        .where(eq(playerStats.userId, userId));
    } catch (error) {
      console.error("Error in getPlayerStatsByUserId:", error);
      return [];
    }
  }

  async getPlayerStatsByMatchId(matchId: number): Promise<PlayerStat[]> {
    try {
      return await db.select()
        .from(playerStats)
        .where(eq(playerStats.matchId, matchId));
    } catch (error) {
      console.error("Error in getPlayerStatsByMatchId:", error);
      return [];
    }
  }

  async insertPlayerStat(statData: Partial<PlayerStat>): Promise<PlayerStat> {
    try {
      const result = await db.insert(playerStats).values(statData).returning();
      return result[0];
    } catch (error) {
      console.error("Error in insertPlayerStat:", error);
      throw error;
    }
  }

  async updatePlayerStat(id: number, statData: Partial<PlayerStat>): Promise<PlayerStat | undefined> {
    try {
      const result = await db.update(playerStats)
        .set(statData)
        .where(eq(playerStats.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error in updatePlayerStat:", error);
      return undefined;
    }
  }
}

export const storage = new PostgresStorage();
