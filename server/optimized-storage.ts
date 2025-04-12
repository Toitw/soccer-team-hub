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
import createMemoryStore from "memorystore";
import session from "express-session";
import path from "path";
import { BaseEntityStorage } from "@shared/storage-utils";
import { hashPassword } from "@shared/auth-utils";

const MemoryStore = createMemoryStore(session);

// Define file paths in a central location
const DATA_DIR = './data';
const PATHS = {
  USERS: path.join(DATA_DIR, 'users.json'),
  TEAMS: path.join(DATA_DIR, 'teams.json'),
  TEAM_MEMBERS: path.join(DATA_DIR, 'team_members.json'),
  MATCHES: path.join(DATA_DIR, 'matches.json'),
  EVENTS: path.join(DATA_DIR, 'events.json'),
  ATTENDANCE: path.join(DATA_DIR, 'attendance.json'),
  PLAYER_STATS: path.join(DATA_DIR, 'player_stats.json'),
  ANNOUNCEMENTS: path.join(DATA_DIR, 'announcements.json'),
  INVITATIONS: path.join(DATA_DIR, 'invitations.json'),
  MATCH_LINEUPS: path.join(DATA_DIR, 'match_lineups.json'),
  TEAM_LINEUPS: path.join(DATA_DIR, 'team_lineups.json'),
  MATCH_SUBSTITUTIONS: path.join(DATA_DIR, 'match_substitutions.json'),
  MATCH_GOALS: path.join(DATA_DIR, 'match_goals.json'),
  MATCH_CARDS: path.join(DATA_DIR, 'match_cards.json'),
  MATCH_PHOTOS: path.join(DATA_DIR, 'match_photos.json'),
  LEAGUE_CLASSIFICATION: path.join(DATA_DIR, 'league_classification.json'),
};

// Define SessionStore type explicitly
type SessionStoreType = ReturnType<typeof createMemoryStore>;

// Specialized entity storage implementations
class UserStorage extends BaseEntityStorage<User, InsertUser> {
  async create(data: InsertUser): Promise<User> {
    const id = this.getNextId();
    // Ensure role is never undefined
    const role = data.role || "player";
    
    const user: User = {
      id,
      username: data.username,
      password: data.password,
      fullName: data.fullName,
      role,
      profilePicture: data.profilePicture || "/default-avatar.png",
      position: data.position,
      jerseyNumber: data.jerseyNumber,
      email: data.email,
      phoneNumber: data.phoneNumber,
    };
    
    this.entities.set(id, user);
    this.persist();
    return user;
  }
  
  async getByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.entities.values()).find(
      (user) => user.username === username,
    );
  }
}

class TeamStorage extends BaseEntityStorage<Team, InsertTeam> {
  async create(data: InsertTeam): Promise<Team> {
    const id = this.getNextId();
    
    const team: Team = {
      id,
      name: data.name,
      logo: data.logo || "/default-team-logo.png",
      division: data.division,
      seasonYear: data.seasonYear,
      createdById: data.createdById,
      joinCode: data.joinCode,
    };
    
    this.entities.set(id, team);
    this.persist();
    return team;
  }
  
  async getByUserId(userId: number): Promise<Team[]> {
    // This method requires team members
    return [];
  }
  
  async getByJoinCode(joinCode: string): Promise<Team | undefined> {
    return Array.from(this.entities.values()).find(
      (team) => team.joinCode === joinCode,
    );
  }
}

class TeamMemberStorage extends BaseEntityStorage<TeamMember, InsertTeamMember> {
  async create(data: InsertTeamMember): Promise<TeamMember> {
    const id = this.getNextId();
    // Ensure role is valid
    const role = data.role || "player";
    
    const teamMember: TeamMember = {
      id,
      teamId: data.teamId,
      userId: data.userId,
      joinedAt: new Date(),
      role,
    };
    
    this.entities.set(id, teamMember);
    this.persist();
    return teamMember;
  }
  
  async getByTeamId(teamId: number): Promise<TeamMember[]> {
    return Array.from(this.entities.values()).filter(
      (member) => member.teamId === teamId
    );
  }
  
  async getByTeamAndUser(teamId: number, userId: number): Promise<TeamMember | undefined> {
    return Array.from(this.entities.values()).find(
      (member) => member.teamId === teamId && member.userId === userId
    );
  }
}

// Export storage factory to maintain compatibility with original implementation
export class OptimizedStorage {
  users: UserStorage;
  teams: TeamStorage;
  teamMembers: TeamMemberStorage;
  sessionStore: SessionStoreType;
  
  constructor() {
    this.users = new UserStorage(PATHS.USERS);
    this.teams = new TeamStorage(PATHS.TEAMS);
    this.teamMembers = new TeamMemberStorage(PATHS.TEAM_MEMBERS);
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Load data from files
    this.loadPersistedData();
  }
  
  private loadPersistedData(): boolean {
    let hasData = false;
    
    // Load from each storage component
    if (this.users.load()) hasData = true;
    if (this.teams.load()) hasData = true;
    if (this.teamMembers.load()) hasData = true;
    
    return hasData;
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.getByUsername(username);
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    // Handle password hashing if needed
    if (insertUser.password && !insertUser.password.includes('.')) {
      insertUser.password = await hashPassword(insertUser.password);
    }
    return this.users.create(insertUser);
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
    const membershipsByUser = await this.teamMembers.getAll().then(members => 
      members.filter(member => member.userId === userId)
    );
    
    const teamIds = membershipsByUser.map(member => member.teamId);
    const teams = await this.teams.getAll();
    
    return teams.filter(team => teamIds.includes(team.id));
  }
  
  async getTeamByJoinCode(joinCode: string): Promise<Team | undefined> {
    return this.teams.getByJoinCode(joinCode);
  }
  
  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    return this.teams.create(insertTeam);
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
  
  async createTeamMember(insertTeamMember: InsertTeamMember): Promise<TeamMember> {
    return this.teamMembers.create(insertTeamMember);
  }
  
  async updateTeamMember(id: number, teamMemberData: Partial<TeamMember>): Promise<TeamMember | undefined> {
    return this.teamMembers.update(id, teamMemberData);
  }
  
  async deleteTeamMember(id: number): Promise<boolean> {
    return this.teamMembers.delete(id);
  }
}

// For backward compatibility
export const hashPasswordInStorage = hashPassword;