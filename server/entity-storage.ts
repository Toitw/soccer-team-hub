import { 
  User, InsertUser,
  Team, InsertTeam,
  TeamMember, InsertTeamMember,
  Match, InsertMatch,
  Event, InsertEvent,
  Attendance, InsertAttendance,
  PlayerStat, InsertPlayerStat,
  Announcement, InsertAnnouncement,
  Invitation, InsertInvitation,
  MatchLineup, InsertMatchLineup,
  TeamLineup, InsertTeamLineup,
  MatchSubstitution, InsertMatchSubstitution,
  MatchGoal, InsertMatchGoal,
  MatchCard, InsertMatchCard,
  MatchPhoto, InsertMatchPhoto,
  LeagueClassification, InsertLeagueClassification
} from "@shared/schema";
import { EntityManager } from "@shared/entity-manager";
import { DataLoader } from "@shared/data-loader";
import { hashPassword } from "@shared/auth-utils";
import createMemoryStore from "memorystore";
import session from "express-session";

// Initialize data directory
DataLoader.initDataDirectory();

// Define SessionStore type
type SessionStoreType = ReturnType<typeof createMemoryStore>;

/**
 * Specialized entity manager for User entities
 */
class UserEntityManager extends EntityManager<User, InsertUser> {
  constructor() {
    super('users');
  }
  
  async getByUsername(username: string): Promise<User | undefined> {
    return this.findOne(user => user.username === username);
  }
  
  async create(data: InsertUser): Promise<User> {
    return super.create(data, (userData, id) => {
      // Ensure role is never undefined
      const role = userData.role || "player";
      
      return {
        id,
        username: userData.username,
        password: userData.password,
        fullName: userData.fullName,
        role,
        profilePicture: userData.profilePicture || "/default-avatar.png",
        position: userData.position,
        jerseyNumber: userData.jerseyNumber,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
      };
    });
  }
}

/**
 * Specialized entity manager for Team entities
 */
class TeamEntityManager extends EntityManager<Team, InsertTeam> {
  constructor() {
    super('teams');
  }
  
  async getByJoinCode(joinCode: string): Promise<Team | undefined> {
    return this.findOne(team => team.joinCode === joinCode);
  }
  
  async create(data: InsertTeam): Promise<Team> {
    return super.create(data, (teamData, id) => ({
      id,
      name: teamData.name,
      logo: teamData.logo || "/default-team-logo.png",
      division: teamData.division,
      seasonYear: teamData.seasonYear,
      createdById: teamData.createdById,
      joinCode: teamData.joinCode,
    }));
  }
}

/**
 * Specialized entity manager for TeamMember entities
 */
class TeamMemberEntityManager extends EntityManager<TeamMember, InsertTeamMember> {
  constructor() {
    super('teamMembers');
  }
  
  async getByTeamId(teamId: number): Promise<TeamMember[]> {
    return this.find(member => member.teamId === teamId);
  }
  
  async getByTeamAndUser(teamId: number, userId: number): Promise<TeamMember | undefined> {
    return this.findOne(member => member.teamId === teamId && member.userId === userId);
  }
  
  async getByUserId(userId: number): Promise<TeamMember[]> {
    return this.find(member => member.userId === userId);
  }
  
  async create(data: InsertTeamMember): Promise<TeamMember> {
    return super.create(data, (memberData, id) => ({
      id,
      teamId: memberData.teamId,
      userId: memberData.userId,
      joinedAt: new Date(),
      role: memberData.role || "player",
    }));
  }
}

/**
 * Specialized entity manager for Match entities
 */
class MatchEntityManager extends EntityManager<Match, InsertMatch> {
  constructor() {
    super('matches');
  }
  
  async getByTeamId(teamId: number): Promise<Match[]> {
    return this.find(match => match.teamId === teamId);
  }
  
  async getRecentByTeamId(teamId: number, limit: number): Promise<Match[]> {
    const matches = await this.getByTeamId(teamId);
    return matches
      .sort((a, b) => b.matchDate.getTime() - a.matchDate.getTime())
      .slice(0, limit);
  }
  
  async create(data: InsertMatch): Promise<Match> {
    return super.create(data, (matchData, id) => ({
      id,
      teamId: matchData.teamId,
      opponentName: matchData.opponentName,
      opponentLogo: matchData.opponentLogo,
      matchDate: new Date(matchData.matchDate),
      location: matchData.location,
      isHome: matchData.isHome,
      goalsScored: matchData.goalsScored,
      goalsConceded: matchData.goalsConceded,
      status: matchData.status || "scheduled",
      matchType: matchData.matchType || "friendly",
      notes: matchData.notes,
    }));
  }
}

/**
 * Specialized entity manager for Event entities
 */
class EventEntityManager extends EntityManager<Event, InsertEvent> {
  constructor() {
    super('events');
  }
  
  async getByTeamId(teamId: number): Promise<Event[]> {
    return this.find(event => event.teamId === teamId);
  }
  
  async getUpcomingByTeamId(teamId: number, limit: number): Promise<Event[]> {
    const now = new Date();
    const events = await this.getByTeamId(teamId);
    return events
      .filter(event => event.startTime > now)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .slice(0, limit);
  }
  
  async create(data: InsertEvent): Promise<Event> {
    return super.create(data, (eventData, id) => ({
      id,
      teamId: eventData.teamId,
      title: eventData.title,
      type: eventData.type,
      startTime: new Date(eventData.startTime),
      endTime: eventData.endTime ? new Date(eventData.endTime) : undefined,
      location: eventData.location,
      description: eventData.description,
      createdById: eventData.createdById,
    }));
  }
}

/**
 * Specialized entity manager for Announcement entities
 */
class AnnouncementEntityManager extends EntityManager<Announcement, InsertAnnouncement> {
  constructor() {
    super('announcements');
  }
  
  async getByTeamId(teamId: number): Promise<Announcement[]> {
    return this.find(announcement => announcement.teamId === teamId);
  }
  
  async getRecentByTeamId(teamId: number, limit: number): Promise<Announcement[]> {
    const announcements = await this.getByTeamId(teamId);
    return announcements
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
  
  async create(data: InsertAnnouncement): Promise<Announcement> {
    return super.create(data, (announcementData, id) => ({
      id,
      teamId: announcementData.teamId,
      title: announcementData.title,
      content: announcementData.content,
      createdAt: new Date(),
      createdById: announcementData.createdById,
    }));
  }
}

/**
 * Main storage system built on entity managers
 */
export class EntityStorage {
  users: UserEntityManager;
  teams: TeamEntityManager;
  teamMembers: TeamMemberEntityManager;
  matches: MatchEntityManager;
  events: EventEntityManager;
  announcements: AnnouncementEntityManager;
  
  sessionStore: SessionStoreType;
  
  constructor() {
    // Initialize entity managers
    this.users = new UserEntityManager();
    this.teams = new TeamEntityManager();
    this.teamMembers = new TeamMemberEntityManager();
    this.matches = new MatchEntityManager();
    this.events = new EventEntityManager();
    this.announcements = new AnnouncementEntityManager();
    
    // Initialize session store
    this.sessionStore = new (createMemoryStore(session))({
      checkPeriod: 86400000, // Prune expired entries every 24h
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.getByUsername(username);
  }
  
  async getAllUsers(): Promise<User[]> {
    return this.users.getAll();
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    // Handle password hashing if needed
    if (userData.password && !userData.password.includes('.')) {
      userData.password = await hashPassword(userData.password);
    }
    return this.users.create(userData);
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    return this.users.update(id, userData);
  }
  
  // Team methods
  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }
  
  async getTeams(): Promise<Team[]> {
    return this.teams.getAll();
  }
  
  async getTeamsByUserId(userId: number): Promise<Team[]> {
    const membershipsByUser = await this.teamMembers.getByUserId(userId);
    const teamIds = membershipsByUser.map(member => member.teamId);
    const teams = await this.teams.getAll();
    return teams.filter(team => teamIds.includes(team.id));
  }
  
  async getTeamByJoinCode(joinCode: string): Promise<Team | undefined> {
    return this.teams.getByJoinCode(joinCode);
  }
  
  async createTeam(teamData: InsertTeam): Promise<Team> {
    return this.teams.create(teamData);
  }
  
  async updateTeam(id: number, teamData: Partial<Team>): Promise<Team | undefined> {
    return this.teams.update(id, teamData);
  }
  
  // TeamMember methods
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return this.teamMembers.getByTeamId(teamId);
  }
  
  async getTeamMember(teamId: number, userId: number): Promise<TeamMember | undefined> {
    return this.teamMembers.getByTeamAndUser(teamId, userId);
  }
  
  async createTeamMember(teamMemberData: InsertTeamMember): Promise<TeamMember> {
    return this.teamMembers.create(teamMemberData);
  }
  
  async updateTeamMember(id: number, teamMemberData: Partial<TeamMember>): Promise<TeamMember | undefined> {
    return this.teamMembers.update(id, teamMemberData);
  }
  
  async deleteTeamMember(id: number): Promise<boolean> {
    return this.teamMembers.delete(id);
  }
  
  // Match methods
  async getMatch(id: number): Promise<Match | undefined> {
    return this.matches.get(id);
  }
  
  async getMatches(teamId: number): Promise<Match[]> {
    return this.matches.getByTeamId(teamId);
  }
  
  async getRecentMatches(teamId: number, limit: number): Promise<Match[]> {
    return this.matches.getRecentByTeamId(teamId, limit);
  }
  
  async createMatch(matchData: InsertMatch): Promise<Match> {
    return this.matches.create(matchData);
  }
  
  async updateMatch(id: number, matchData: Partial<Match>): Promise<Match | undefined> {
    return this.matches.update(id, matchData);
  }
  
  // Event methods
  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }
  
  async getEvents(teamId: number): Promise<Event[]> {
    return this.events.getByTeamId(teamId);
  }
  
  async getUpcomingEvents(teamId: number, limit: number): Promise<Event[]> {
    return this.events.getUpcomingByTeamId(teamId, limit);
  }
  
  async createEvent(eventData: InsertEvent): Promise<Event> {
    return this.events.create(eventData);
  }
  
  async updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined> {
    return this.events.update(id, eventData);
  }
  
  async deleteEvent(id: number): Promise<boolean> {
    return this.events.delete(id);
  }
  
  // Announcement methods
  async getAnnouncement(id: number): Promise<Announcement | undefined> {
    return this.announcements.get(id);
  }
  
  async getAnnouncements(teamId: number): Promise<Announcement[]> {
    return this.announcements.getByTeamId(teamId);
  }
  
  async getRecentAnnouncements(teamId: number, limit: number): Promise<Announcement[]> {
    return this.announcements.getRecentByTeamId(teamId, limit);
  }
  
  async createAnnouncement(announcementData: InsertAnnouncement): Promise<Announcement> {
    return this.announcements.create(announcementData);
  }
  
  async updateAnnouncement(id: number, announcementData: Partial<Announcement>): Promise<Announcement | undefined> {
    return this.announcements.update(id, announcementData);
  }
  
  async deleteAnnouncement(id: number): Promise<boolean> {
    return this.announcements.delete(id);
  }
}