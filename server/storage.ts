import { 
  users, type User, type InsertUser,
  teams, type Team, type InsertTeam,
  teamMembers, type TeamMember, type InsertTeamMember,
  matches, type Match, type InsertMatch,
  events, type Event, type InsertEvent,
  attendance, type Attendance, type InsertAttendance,
  playerStats, type PlayerStat, type InsertPlayerStat,
  announcements, type Announcement, type InsertAnnouncement,
  invitations, type Invitation, type InsertInvitation
} from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const MemoryStore = createMemoryStore(session);

// Define SessionStore type explicitly
type SessionStoreType = ReturnType<typeof createMemoryStore>;

// Separate password hashing logic since auth.ts imports this file
const scryptAsync = promisify(scrypt);

export async function hashPasswordInStorage(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Team methods
  getTeam(id: number): Promise<Team | undefined>;
  getTeams(): Promise<Team[]>;
  getTeamsByUserId(userId: number): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, teamData: Partial<Team>): Promise<Team | undefined>;
  
  // TeamMember methods
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  getTeamMember(teamId: number, userId: number): Promise<TeamMember | undefined>;
  createTeamMember(teamMember: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: number, teamMemberData: Partial<TeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: number): Promise<boolean>;
  
  // Match methods
  getMatch(id: number): Promise<Match | undefined>;
  getMatches(teamId: number): Promise<Match[]>;
  getRecentMatches(teamId: number, limit: number): Promise<Match[]>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: number, matchData: Partial<Match>): Promise<Match | undefined>;
  
  // Event methods
  getEvent(id: number): Promise<Event | undefined>;
  getEvents(teamId: number): Promise<Event[]>;
  getUpcomingEvents(teamId: number, limit: number): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  
  // Attendance methods
  getAttendance(eventId: number): Promise<Attendance[]>;
  getUserAttendance(userId: number): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, attendanceData: Partial<Attendance>): Promise<Attendance | undefined>;
  
  // PlayerStat methods
  getPlayerStats(userId: number): Promise<PlayerStat[]>;
  getMatchPlayerStats(matchId: number): Promise<PlayerStat[]>;
  createPlayerStat(playerStat: InsertPlayerStat): Promise<PlayerStat>;
  updatePlayerStat(id: number, playerStatData: Partial<PlayerStat>): Promise<PlayerStat | undefined>;
  
  // Announcement methods
  getAnnouncement(id: number): Promise<Announcement | undefined>;
  getAnnouncements(teamId: number): Promise<Announcement[]>;
  getRecentAnnouncements(teamId: number, limit: number): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  deleteAnnouncement(id: number): Promise<boolean>;
  
  // Invitation methods
  getInvitation(id: number): Promise<Invitation | undefined>;
  getInvitations(teamId: number): Promise<Invitation[]>;
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  updateInvitation(id: number, invitationData: Partial<Invitation>): Promise<Invitation | undefined>;
  
  // Lineup methods
  getLineup(id: number): Promise<Lineup | undefined>;
  getLineups(teamId: number): Promise<Lineup[]>;
  createLineup(lineup: InsertLineup): Promise<Lineup>;
  updateLineup(id: number, lineupData: Partial<Lineup>): Promise<Lineup | undefined>;
  deleteLineup(id: number): Promise<boolean>;
  
  // Session store for authentication
  sessionStore: SessionStoreType;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private teams: Map<number, Team>;
  private teamMembers: Map<number, TeamMember>;
  private matches: Map<number, Match>;
  private events: Map<number, Event>;
  private attendance: Map<number, Attendance>;
  private playerStats: Map<number, PlayerStat>;
  private announcements: Map<number, Announcement>;
  private invitations: Map<number, Invitation>;
  private lineups: Map<number, Lineup>;
  
  sessionStore: SessionStoreType;
  
  private userCurrentId: number;
  private teamCurrentId: number;
  private teamMemberCurrentId: number;
  private matchCurrentId: number;
  private eventCurrentId: number;
  private attendanceCurrentId: number;
  private playerStatCurrentId: number;
  private announcementCurrentId: number;
  private invitationCurrentId: number;
  private lineupCurrentId: number;

  constructor() {
    this.users = new Map();
    this.teams = new Map();
    this.teamMembers = new Map();
    this.matches = new Map();
    this.events = new Map();
    this.attendance = new Map();
    this.playerStats = new Map();
    this.announcements = new Map();
    this.invitations = new Map();
    this.lineups = new Map();
    
    this.userCurrentId = 1;
    this.teamCurrentId = 1;
    this.teamMemberCurrentId = 1;
    this.matchCurrentId = 1;
    this.eventCurrentId = 1;
    this.attendanceCurrentId = 1;
    this.playerStatCurrentId = 1;
    this.announcementCurrentId = 1;
    this.invitationCurrentId = 1;
    this.lineupCurrentId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Initialize with some data
    this.initializeData().catch(err => {
      console.error("Error initializing data:", err);
    });
  }

  private async initializeData() {
    // Create hashed passwords for demo users
    const hashedPassword = await hashPasswordInStorage("password123");
    
    // Add demo data here
    const demoAdmin = await this.createUser({
      username: "admin",
      password: hashedPassword,
      fullName: "Admin User",
      role: "admin",
      email: "admin@example.com",
      profilePicture: "https://ui-avatars.com/api/?name=Admin+User&background=0D47A1&color=fff"
    });
    
    const demoCoach = await this.createUser({
      username: "coach",
      password: hashedPassword,
      fullName: "Coach Smith",
      role: "coach",
      email: "coach@example.com",
      profilePicture: "https://ui-avatars.com/api/?name=Coach+Smith&background=4CAF50&color=fff"
    });
    
    const demoPlayer1 = await this.createUser({
      username: "player1",
      password: hashedPassword,
      fullName: "Marcus Rashford",
      role: "player",
      position: "Forward",
      jerseyNumber: 9,
      email: "player1@example.com",
      profilePicture: "https://ui-avatars.com/api/?name=Marcus+Rashford&background=FFC107&color=fff"
    });
    
    const demoPlayer2 = await this.createUser({
      username: "player2",
      password: hashedPassword,
      fullName: "Bruno Fernandes",
      role: "player",
      position: "Midfielder",
      jerseyNumber: 7,
      email: "player2@example.com",
      profilePicture: "https://ui-avatars.com/api/?name=Bruno+Fernandes&background=FFC107&color=fff"
    });
    
    const demoPlayer3 = await this.createUser({
      username: "player3",
      password: hashedPassword,
      fullName: "Jadon Sancho",
      role: "player",
      position: "Winger",
      jerseyNumber: 6,
      email: "player3@example.com",
      profilePicture: "https://ui-avatars.com/api/?name=Jadon+Sancho&background=FFC107&color=fff"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Team methods
  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async getTeamsByUserId(userId: number): Promise<Team[]> {
    const teamMemberEntries = Array.from(this.teamMembers.values()).filter(
      (member) => member.userId === userId
    );
    
    const teamIds = teamMemberEntries.map((member) => member.teamId);
    return Array.from(this.teams.values()).filter(
      (team) => teamIds.includes(team.id)
    );
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const id = this.teamCurrentId++;
    const team: Team = { ...insertTeam, id };
    this.teams.set(id, team);
    return team;
  }

  async updateTeam(id: number, teamData: Partial<Team>): Promise<Team | undefined> {
    const team = this.teams.get(id);
    if (!team) return undefined;
    
    const updatedTeam: Team = { ...team, ...teamData };
    this.teams.set(id, updatedTeam);
    return updatedTeam;
  }

  // TeamMember methods
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values()).filter(
      (member) => member.teamId === teamId
    );
  }

  async getTeamMember(teamId: number, userId: number): Promise<TeamMember | undefined> {
    return Array.from(this.teamMembers.values()).find(
      (member) => member.teamId === teamId && member.userId === userId
    );
  }

  async createTeamMember(insertTeamMember: InsertTeamMember): Promise<TeamMember> {
    const id = this.teamMemberCurrentId++;
    const teamMember: TeamMember = { ...insertTeamMember, id, joinedAt: new Date() };
    this.teamMembers.set(id, teamMember);
    return teamMember;
  }

  async updateTeamMember(id: number, teamMemberData: Partial<TeamMember>): Promise<TeamMember | undefined> {
    const teamMember = this.teamMembers.get(id);
    if (!teamMember) return undefined;
    
    const updatedTeamMember: TeamMember = { ...teamMember, ...teamMemberData };
    this.teamMembers.set(id, updatedTeamMember);
    return updatedTeamMember;
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    return this.teamMembers.delete(id);
  }

  // Match methods
  async getMatch(id: number): Promise<Match | undefined> {
    return this.matches.get(id);
  }

  async getMatches(teamId: number): Promise<Match[]> {
    return Array.from(this.matches.values()).filter(
      (match) => match.teamId === teamId
    );
  }

  async getRecentMatches(teamId: number, limit: number): Promise<Match[]> {
    const teamMatches = await this.getMatches(teamId);
    return teamMatches
      .filter(match => match.status === "completed")
      .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())
      .slice(0, limit);
  }

  async createMatch(insertMatch: InsertMatch): Promise<Match> {
    const id = this.matchCurrentId++;
    const match: Match = { ...insertMatch, id };
    this.matches.set(id, match);
    return match;
  }

  async updateMatch(id: number, matchData: Partial<Match>): Promise<Match | undefined> {
    const match = this.matches.get(id);
    if (!match) return undefined;
    
    const updatedMatch: Match = { ...match, ...matchData };
    this.matches.set(id, updatedMatch);
    return updatedMatch;
  }

  // Event methods
  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getEvents(teamId: number): Promise<Event[]> {
    return Array.from(this.events.values()).filter(
      (event) => event.teamId === teamId
    );
  }

  async getUpcomingEvents(teamId: number, limit: number): Promise<Event[]> {
    const now = new Date();
    const teamEvents = await this.getEvents(teamId);
    return teamEvents
      .filter(event => new Date(event.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, limit);
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = this.eventCurrentId++;
    const event: Event = { ...insertEvent, id };
    this.events.set(id, event);
    return event;
  }

  async updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    
    const updatedEvent: Event = { ...event, ...eventData };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    return this.events.delete(id);
  }

  // Attendance methods
  async getAttendance(eventId: number): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(
      (attendance) => attendance.eventId === eventId
    );
  }

  async getUserAttendance(userId: number): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(
      (attendance) => attendance.userId === userId
    );
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const id = this.attendanceCurrentId++;
    const attendance: Attendance = { ...insertAttendance, id };
    this.attendance.set(id, attendance);
    return attendance;
  }

  async updateAttendance(id: number, attendanceData: Partial<Attendance>): Promise<Attendance | undefined> {
    const attendance = this.attendance.get(id);
    if (!attendance) return undefined;
    
    const updatedAttendance: Attendance = { ...attendance, ...attendanceData };
    this.attendance.set(id, updatedAttendance);
    return updatedAttendance;
  }

  // PlayerStat methods
  async getPlayerStats(userId: number): Promise<PlayerStat[]> {
    return Array.from(this.playerStats.values()).filter(
      (stat) => stat.userId === userId
    );
  }

  async getMatchPlayerStats(matchId: number): Promise<PlayerStat[]> {
    return Array.from(this.playerStats.values()).filter(
      (stat) => stat.matchId === matchId
    );
  }

  async createPlayerStat(insertPlayerStat: InsertPlayerStat): Promise<PlayerStat> {
    const id = this.playerStatCurrentId++;
    const playerStat: PlayerStat = { ...insertPlayerStat, id };
    this.playerStats.set(id, playerStat);
    return playerStat;
  }

  async updatePlayerStat(id: number, playerStatData: Partial<PlayerStat>): Promise<PlayerStat | undefined> {
    const playerStat = this.playerStats.get(id);
    if (!playerStat) return undefined;
    
    const updatedPlayerStat: PlayerStat = { ...playerStat, ...playerStatData };
    this.playerStats.set(id, updatedPlayerStat);
    return updatedPlayerStat;
  }

  // Announcement methods
  async getAnnouncement(id: number): Promise<Announcement | undefined> {
    return this.announcements.get(id);
  }

  async getAnnouncements(teamId: number): Promise<Announcement[]> {
    return Array.from(this.announcements.values()).filter(
      (announcement) => announcement.teamId === teamId
    );
  }

  async getRecentAnnouncements(teamId: number, limit: number): Promise<Announcement[]> {
    const teamAnnouncements = await this.getAnnouncements(teamId);
    return teamAnnouncements
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async createAnnouncement(insertAnnouncement: InsertAnnouncement): Promise<Announcement> {
    const id = this.announcementCurrentId++;
    const announcement: Announcement = { ...insertAnnouncement, id, createdAt: new Date() };
    this.announcements.set(id, announcement);
    return announcement;
  }

  async deleteAnnouncement(id: number): Promise<boolean> {
    return this.announcements.delete(id);
  }

  // Invitation methods
  async getInvitation(id: number): Promise<Invitation | undefined> {
    return this.invitations.get(id);
  }

  async getInvitations(teamId: number): Promise<Invitation[]> {
    return Array.from(this.invitations.values()).filter(
      (invitation) => invitation.teamId === teamId
    );
  }

  async createInvitation(insertInvitation: InsertInvitation): Promise<Invitation> {
    const id = this.invitationCurrentId++;
    const invitation: Invitation = { ...insertInvitation, id, createdAt: new Date(), status: "pending" };
    this.invitations.set(id, invitation);
    return invitation;
  }

  async updateInvitation(id: number, invitationData: Partial<Invitation>): Promise<Invitation | undefined> {
    const invitation = this.invitations.get(id);
    if (!invitation) return undefined;
    
    const updatedInvitation: Invitation = { ...invitation, ...invitationData };
    this.invitations.set(id, updatedInvitation);
    return updatedInvitation;
  }
  
  // Lineup methods
  async getLineup(id: number): Promise<Lineup | undefined> {
    return this.lineups.get(id);
  }

  async getLineups(teamId: number): Promise<Lineup[]> {
    return Array.from(this.lineups.values()).filter(
      (lineup) => lineup.teamId === teamId
    );
  }

  async createLineup(insertLineup: InsertLineup): Promise<Lineup> {
    const id = this.lineupCurrentId++;
    
    // Handle positions serialization if it's not already a string
    let positionsData = insertLineup.positions;
    if (typeof positionsData !== 'string') {
      positionsData = JSON.stringify(positionsData);
    }
    
    const lineup: Lineup = { 
      ...insertLineup, 
      positions: positionsData, 
      id, 
      createdAt: new Date() 
    };
    
    this.lineups.set(id, lineup);
    return lineup;
  }

  async updateLineup(id: number, lineupData: Partial<Lineup>): Promise<Lineup | undefined> {
    const lineup = this.lineups.get(id);
    if (!lineup) return undefined;
    
    // Handle positions serialization if it's not already a string
    if (lineupData.positions && typeof lineupData.positions !== 'string') {
      lineupData.positions = JSON.stringify(lineupData.positions);
    }
    
    const updatedLineup: Lineup = { ...lineup, ...lineupData };
    this.lineups.set(id, updatedLineup);
    return updatedLineup;
  }

  async deleteLineup(id: number): Promise<boolean> {
    return this.lineups.delete(id);
  }
}

export const storage = new MemStorage();
