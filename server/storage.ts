import {
  // User types
  users, type User, type InsertUser,
  // Team types
  teams, type Team, type InsertTeam,
  // Team member types
  teamMembers, type TeamMember, type InsertTeamMember,
  // Match types
  matches, type Match, type InsertMatch,
  // Event types
  events, type Event, type InsertEvent,
  // Attendance types
  attendance, type Attendance, type InsertAttendance,
  // PlayerStat types
  playerStats, type PlayerStat, type InsertPlayerStat,
  // Announcement types
  announcements, type Announcement, type InsertAnnouncement,
  // Invitation types
  invitations, type Invitation, type InsertInvitation,
  // MatchLineup types
  matchLineups, type MatchLineup, type InsertMatchLineup,
  // TeamLineup types
  teamLineups, type TeamLineup, type InsertTeamLineup,
  // MatchSubstitution types
  matchSubstitutions, type MatchSubstitution, type InsertMatchSubstitution,
  // MatchGoal types
  matchGoals, type MatchGoal, type InsertMatchGoal,
  // MatchCard types
  matchCards, type MatchCard, type InsertMatchCard,
  // MatchPhoto types
  matchPhotos, type MatchPhoto, type InsertMatchPhoto,
  // LeagueClassification types
  leagueClassifications, type LeagueClassification, type InsertLeagueClassification,
} from "@shared/schema";

// Storage interface with all CRUD methods needed for the football dashboard
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Team methods
  getTeam(id: number): Promise<Team | undefined>;
  getTeams(): Promise<Team[]>;
  getTeamsByUserId(userId: number): Promise<Team[]>;
  getTeamByJoinCode(joinCode: string): Promise<Team | undefined>;
  createTeam(teamData: InsertTeam): Promise<Team>;
  updateTeam(id: number, teamData: Partial<Team>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;

  // Team member methods
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  getTeamMember(teamId: number, userId: number): Promise<TeamMember | undefined>;
  getTeamMembersByUserId(userId: number): Promise<TeamMember[]>;
  createTeamMember(teamMemberData: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: number, teamMemberData: Partial<TeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: number): Promise<boolean>;

  // Match methods
  getMatch(id: number): Promise<Match | undefined>;
  getMatches(teamId: number): Promise<Match[]>;
  getRecentMatches(teamId: number, limit: number): Promise<Match[]>;
  createMatch(matchData: InsertMatch): Promise<Match>;
  updateMatch(id: number, matchData: Partial<Match>): Promise<Match | undefined>;
  
  // Event methods
  getEvent(id: number): Promise<Event | undefined>;
  getEvents(teamId: number): Promise<Event[]>;
  getUpcomingEvents(teamId: number, limit: number): Promise<Event[]>;
  createEvent(eventData: InsertEvent): Promise<Event>;
  updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;

  // Attendance methods
  getAttendance(eventId: number): Promise<Attendance[]>;
  getUserAttendance(userId: number): Promise<Attendance[]>;
  createAttendance(attendanceData: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, attendanceData: Partial<Attendance>): Promise<Attendance | undefined>;

  // PlayerStat methods
  getPlayerStats(userId: number): Promise<PlayerStat[]>;
  getMatchPlayerStats(matchId: number): Promise<PlayerStat[]>;
  createPlayerStat(playerStatData: InsertPlayerStat): Promise<PlayerStat>;
  updatePlayerStat(id: number, playerStatData: Partial<PlayerStat>): Promise<PlayerStat | undefined>;

  // Announcement methods
  getAnnouncement(id: number): Promise<Announcement | undefined>;
  getAnnouncements(teamId: number): Promise<Announcement[]>;
  getRecentAnnouncements(teamId: number, limit: number): Promise<Announcement[]>;
  createAnnouncement(announcementData: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: number, announcementData: Partial<Announcement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: number): Promise<boolean>;

  // Invitation methods
  getInvitation(id: number): Promise<Invitation | undefined>;
  getInvitations(teamId: number): Promise<Invitation[]>;
  createInvitation(invitationData: InsertInvitation): Promise<Invitation>;
  updateInvitation(id: number, invitationData: Partial<Invitation>): Promise<Invitation | undefined>;

  // MatchLineup methods
  getMatchLineup(matchId: number): Promise<MatchLineup | undefined>;
  createMatchLineup(lineupData: InsertMatchLineup): Promise<MatchLineup>;
  updateMatchLineup(id: number, lineupData: Partial<MatchLineup>): Promise<MatchLineup | undefined>;

  // TeamLineup methods
  getTeamLineup(teamId: number): Promise<TeamLineup | undefined>;
  createTeamLineup(lineupData: InsertTeamLineup): Promise<TeamLineup>;
  updateTeamLineup(id: number, lineupData: Partial<TeamLineup>): Promise<TeamLineup | undefined>;

  // MatchSubstitution methods
  getMatchSubstitutions(matchId: number): Promise<MatchSubstitution[]>;
  createMatchSubstitution(substitutionData: InsertMatchSubstitution): Promise<MatchSubstitution>;
  updateMatchSubstitution(id: number, substitutionData: Partial<MatchSubstitution>): Promise<MatchSubstitution | undefined>;
  deleteMatchSubstitution(id: number): Promise<boolean>;

  // MatchGoal methods
  getMatchGoals(matchId: number): Promise<MatchGoal[]>;
  createMatchGoal(goalData: InsertMatchGoal): Promise<MatchGoal>;
  updateMatchGoal(id: number, goalData: Partial<MatchGoal>): Promise<MatchGoal | undefined>;
  deleteMatchGoal(id: number): Promise<boolean>;

  // MatchCard methods
  getMatchCards(matchId: number): Promise<MatchCard[]>;
  createMatchCard(cardData: InsertMatchCard): Promise<MatchCard>;
  updateMatchCard(id: number, cardData: Partial<MatchCard>): Promise<MatchCard | undefined>;
  deleteMatchCard(id: number): Promise<boolean>;

  // MatchPhoto methods
  getMatchPhoto(id: number): Promise<MatchPhoto | undefined>;
  getMatchPhotos(matchId: number): Promise<MatchPhoto[]>;
  createMatchPhoto(photoData: InsertMatchPhoto): Promise<MatchPhoto>;
  updateMatchPhoto(id: number, photoData: Partial<MatchPhoto>): Promise<MatchPhoto | undefined>;
  deleteMatchPhoto(id: number): Promise<boolean>;

  // LeagueClassification methods
  getLeagueClassifications(teamId: number): Promise<LeagueClassification[]>;
  getLeagueClassification(id: number): Promise<LeagueClassification | undefined>;
  createLeagueClassification(classificationData: InsertLeagueClassification): Promise<LeagueClassification>;
  updateLeagueClassification(id: number, classificationData: Partial<LeagueClassification>): Promise<LeagueClassification | undefined>;
  deleteLeagueClassification(id: number): Promise<boolean>;
  bulkCreateLeagueClassifications(classificationsData: InsertLeagueClassification[]): Promise<LeagueClassification[]>;
  deleteAllTeamClassifications(teamId: number): Promise<boolean>;
  getTeamClassifications(teamId: number): Promise<LeagueClassification[]>;
}

// In-memory storage implementation for testing
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
  private matchLineups: Map<number, MatchLineup>;
  private teamLineups: Map<number, TeamLineup>;
  private matchSubstitutions: Map<number, MatchSubstitution>;
  private matchGoals: Map<number, MatchGoal>;
  private matchCards: Map<number, MatchCard>;
  private matchPhotos: Map<number, MatchPhoto>;
  private leagueClassifications: Map<number, LeagueClassification>;
  
  private currentIds: {
    users: number;
    teams: number;
    teamMembers: number;
    matches: number;
    events: number;
    attendance: number;
    playerStats: number;
    announcements: number;
    invitations: number;
    matchLineups: number;
    teamLineups: number;
    matchSubstitutions: number;
    matchGoals: number;
    matchCards: number;
    matchPhotos: number;
    leagueClassifications: number;
  };

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
    this.matchLineups = new Map();
    this.teamLineups = new Map();
    this.matchSubstitutions = new Map();
    this.matchGoals = new Map();
    this.matchCards = new Map();
    this.matchPhotos = new Map();
    this.leagueClassifications = new Map();
    
    this.currentIds = {
      users: 1,
      teams: 1,
      teamMembers: 1,
      matches: 1,
      events: 1,
      attendance: 1,
      playerStats: 1,
      announcements: 1,
      invitations: 1,
      matchLineups: 1,
      teamLineups: 1,
      matchSubstitutions: 1,
      matchGoals: 1,
      matchCards: 1,
      matchPhotos: 1,
      leagueClassifications: 1,
    };
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

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: now,
      updatedAt: now
    } as User;
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }
    const updatedUser: User = { 
      ...existingUser, 
      ...userData,
      updatedAt: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Team methods
  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async getTeamsByUserId(userId: number): Promise<Team[]> {
    // Find all team memberships for this user
    const memberships = Array.from(this.teamMembers.values()).filter(
      member => member.userId === userId
    );
    
    // Get the teams for these memberships
    return memberships.map(membership => 
      this.teams.get(membership.teamId)
    ).filter(Boolean) as Team[];
  }

  async getTeamByJoinCode(joinCode: string): Promise<Team | undefined> {
    return Array.from(this.teams.values()).find(
      team => team.joinCode === joinCode
    );
  }

  async createTeam(teamData: InsertTeam): Promise<Team> {
    const id = this.currentIds.teams++;
    const now = new Date();
    const team: Team = {
      ...teamData,
      id,
      createdAt: now,
      updatedAt: now
    } as Team;
    this.teams.set(id, team);
    return team;
  }

  async updateTeam(id: number, teamData: Partial<Team>): Promise<Team | undefined> {
    const existingTeam = this.teams.get(id);
    if (!existingTeam) {
      return undefined;
    }
    const updatedTeam: Team = {
      ...existingTeam,
      ...teamData,
      updatedAt: new Date()
    };
    this.teams.set(id, updatedTeam);
    return updatedTeam;
  }

  async deleteTeam(id: number): Promise<boolean> {
    return this.teams.delete(id);
  }

  // Team member methods
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values()).filter(
      member => member.teamId === teamId
    );
  }

  async getTeamMember(teamId: number, userId: number): Promise<TeamMember | undefined> {
    return Array.from(this.teamMembers.values()).find(
      member => member.teamId === teamId && member.userId === userId
    );
  }

  async getTeamMembersByUserId(userId: number): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values()).filter(
      member => member.userId === userId
    );
  }

  async createTeamMember(teamMemberData: InsertTeamMember): Promise<TeamMember> {
    const id = this.currentIds.teamMembers++;
    const now = new Date();
    const teamMember: TeamMember = {
      ...teamMemberData,
      id,
      joinedAt: now,
      updatedAt: now
    } as TeamMember;
    this.teamMembers.set(id, teamMember);
    return teamMember;
  }

  async updateTeamMember(id: number, teamMemberData: Partial<TeamMember>): Promise<TeamMember | undefined> {
    const existingTeamMember = this.teamMembers.get(id);
    if (!existingTeamMember) {
      return undefined;
    }
    const updatedTeamMember: TeamMember = {
      ...existingTeamMember,
      ...teamMemberData,
      updatedAt: new Date()
    };
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
      match => match.teamId === teamId
    );
  }

  async getRecentMatches(teamId: number, limit: number): Promise<Match[]> {
    return Array.from(this.matches.values())
      .filter(match => match.teamId === teamId)
      .sort((a, b) => (new Date(b.date || 0)).getTime() - (new Date(a.date || 0)).getTime())
      .slice(0, limit);
  }

  async createMatch(matchData: InsertMatch): Promise<Match> {
    const id = this.currentIds.matches++;
    const now = new Date();
    const match: Match = {
      ...matchData,
      id,
      createdAt: now,
      updatedAt: now
    } as Match;
    this.matches.set(id, match);
    return match;
  }

  async updateMatch(id: number, matchData: Partial<Match>): Promise<Match | undefined> {
    const existingMatch = this.matches.get(id);
    if (!existingMatch) {
      return undefined;
    }
    const updatedMatch: Match = {
      ...existingMatch,
      ...matchData,
      updatedAt: new Date()
    };
    this.matches.set(id, updatedMatch);
    return updatedMatch;
  }

  // Event methods
  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getEvents(teamId: number): Promise<Event[]> {
    return Array.from(this.events.values()).filter(
      event => event.teamId === teamId
    );
  }

  async getUpcomingEvents(teamId: number, limit: number): Promise<Event[]> {
    const now = new Date();
    return Array.from(this.events.values())
      .filter(event => 
        event.teamId === teamId && 
        new Date(event.startTime).getTime() >= now.getTime()
      )
      .sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
      .slice(0, limit);
  }

  async createEvent(eventData: InsertEvent): Promise<Event> {
    const id = this.currentIds.events++;
    const now = new Date();
    const event: Event = {
      ...eventData,
      id,
      createdAt: now,
      updatedAt: now
    } as Event;
    this.events.set(id, event);
    return event;
  }

  async updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined> {
    const existingEvent = this.events.get(id);
    if (!existingEvent) {
      return undefined;
    }
    const updatedEvent: Event = {
      ...existingEvent,
      ...eventData,
      updatedAt: new Date()
    };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    return this.events.delete(id);
  }

  // Attendance methods
  async getAttendance(eventId: number): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(
      attendance => attendance.eventId === eventId
    );
  }

  async getUserAttendance(userId: number): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(
      attendance => attendance.userId === userId
    );
  }

  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const id = this.currentIds.attendance++;
    const now = new Date();
    const attendance: Attendance = {
      ...attendanceData,
      id,
      createdAt: now,
      updatedAt: now
    } as Attendance;
    this.attendance.set(id, attendance);
    return attendance;
  }

  async updateAttendance(id: number, attendanceData: Partial<Attendance>): Promise<Attendance | undefined> {
    const existingAttendance = this.attendance.get(id);
    if (!existingAttendance) {
      return undefined;
    }
    const updatedAttendance: Attendance = {
      ...existingAttendance,
      ...attendanceData,
      updatedAt: new Date()
    };
    this.attendance.set(id, updatedAttendance);
    return updatedAttendance;
  }

  // PlayerStat methods
  async getPlayerStats(userId: number): Promise<PlayerStat[]> {
    return Array.from(this.playerStats.values()).filter(
      stat => stat.userId === userId
    );
  }

  async getMatchPlayerStats(matchId: number): Promise<PlayerStat[]> {
    return Array.from(this.playerStats.values()).filter(
      stat => stat.matchId === matchId
    );
  }

  async createPlayerStat(playerStatData: InsertPlayerStat): Promise<PlayerStat> {
    const id = this.currentIds.playerStats++;
    const now = new Date();
    const playerStat: PlayerStat = {
      ...playerStatData,
      id,
      createdAt: now,
      updatedAt: now
    } as PlayerStat;
    this.playerStats.set(id, playerStat);
    return playerStat;
  }

  async updatePlayerStat(id: number, playerStatData: Partial<PlayerStat>): Promise<PlayerStat | undefined> {
    const existingPlayerStat = this.playerStats.get(id);
    if (!existingPlayerStat) {
      return undefined;
    }
    const updatedPlayerStat: PlayerStat = {
      ...existingPlayerStat,
      ...playerStatData,
      updatedAt: new Date()
    };
    this.playerStats.set(id, updatedPlayerStat);
    return updatedPlayerStat;
  }

  // Announcement methods
  async getAnnouncement(id: number): Promise<Announcement | undefined> {
    return this.announcements.get(id);
  }

  async getAnnouncements(teamId: number): Promise<Announcement[]> {
    return Array.from(this.announcements.values()).filter(
      announcement => announcement.teamId === teamId
    );
  }

  async getRecentAnnouncements(teamId: number, limit: number): Promise<Announcement[]> {
    return Array.from(this.announcements.values())
      .filter(announcement => announcement.teamId === teamId)
      .sort((a, b) => (new Date(b.createdAt || 0)).getTime() - (new Date(a.createdAt || 0)).getTime())
      .slice(0, limit);
  }

  async createAnnouncement(announcementData: InsertAnnouncement): Promise<Announcement> {
    const id = this.currentIds.announcements++;
    const now = new Date();
    const announcement: Announcement = {
      ...announcementData,
      id,
      createdAt: now,
      updatedAt: now
    } as Announcement;
    this.announcements.set(id, announcement);
    return announcement;
  }

  async updateAnnouncement(id: number, announcementData: Partial<Announcement>): Promise<Announcement | undefined> {
    const existingAnnouncement = this.announcements.get(id);
    if (!existingAnnouncement) {
      return undefined;
    }
    const updatedAnnouncement: Announcement = {
      ...existingAnnouncement,
      ...announcementData,
      updatedAt: new Date()
    };
    this.announcements.set(id, updatedAnnouncement);
    return updatedAnnouncement;
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
      invitation => invitation.teamId === teamId
    );
  }

  async createInvitation(invitationData: InsertInvitation): Promise<Invitation> {
    const id = this.currentIds.invitations++;
    const now = new Date();
    const invitation: Invitation = {
      ...invitationData,
      id,
      createdAt: now,
      updatedAt: now
    } as Invitation;
    this.invitations.set(id, invitation);
    return invitation;
  }

  async updateInvitation(id: number, invitationData: Partial<Invitation>): Promise<Invitation | undefined> {
    const existingInvitation = this.invitations.get(id);
    if (!existingInvitation) {
      return undefined;
    }
    const updatedInvitation: Invitation = {
      ...existingInvitation,
      ...invitationData,
      updatedAt: new Date()
    };
    this.invitations.set(id, updatedInvitation);
    return updatedInvitation;
  }

  // MatchLineup methods
  async getMatchLineup(matchId: number): Promise<MatchLineup | undefined> {
    return Array.from(this.matchLineups.values()).find(
      lineup => lineup.matchId === matchId
    );
  }

  async createMatchLineup(lineupData: InsertMatchLineup): Promise<MatchLineup> {
    const id = this.currentIds.matchLineups++;
    const now = new Date();
    const matchLineup: MatchLineup = {
      ...lineupData,
      id,
      createdAt: now,
      updatedAt: now
    } as MatchLineup;
    this.matchLineups.set(id, matchLineup);
    return matchLineup;
  }

  async updateMatchLineup(id: number, lineupData: Partial<MatchLineup>): Promise<MatchLineup | undefined> {
    const existingMatchLineup = this.matchLineups.get(id);
    if (!existingMatchLineup) {
      return undefined;
    }
    const updatedMatchLineup: MatchLineup = {
      ...existingMatchLineup,
      ...lineupData,
      updatedAt: new Date()
    };
    this.matchLineups.set(id, updatedMatchLineup);
    return updatedMatchLineup;
  }

  // TeamLineup methods
  async getTeamLineup(teamId: number): Promise<TeamLineup | undefined> {
    return Array.from(this.teamLineups.values()).find(
      lineup => lineup.teamId === teamId
    );
  }

  async createTeamLineup(lineupData: InsertTeamLineup): Promise<TeamLineup> {
    const id = this.currentIds.teamLineups++;
    const now = new Date();
    const teamLineup: TeamLineup = {
      ...lineupData,
      id,
      createdAt: now,
      updatedAt: now
    } as TeamLineup;
    this.teamLineups.set(id, teamLineup);
    return teamLineup;
  }

  async updateTeamLineup(id: number, lineupData: Partial<TeamLineup>): Promise<TeamLineup | undefined> {
    const existingTeamLineup = this.teamLineups.get(id);
    if (!existingTeamLineup) {
      return undefined;
    }
    const updatedTeamLineup: TeamLineup = {
      ...existingTeamLineup,
      ...lineupData,
      updatedAt: new Date()
    };
    this.teamLineups.set(id, updatedTeamLineup);
    return updatedTeamLineup;
  }

  // MatchSubstitution methods
  async getMatchSubstitutions(matchId: number): Promise<MatchSubstitution[]> {
    return Array.from(this.matchSubstitutions.values()).filter(
      substitution => substitution.matchId === matchId
    );
  }

  async createMatchSubstitution(substitutionData: InsertMatchSubstitution): Promise<MatchSubstitution> {
    const id = this.currentIds.matchSubstitutions++;
    const now = new Date();
    const matchSubstitution: MatchSubstitution = {
      ...substitutionData,
      id,
      createdAt: now
    } as MatchSubstitution;
    this.matchSubstitutions.set(id, matchSubstitution);
    return matchSubstitution;
  }

  async updateMatchSubstitution(id: number, substitutionData: Partial<MatchSubstitution>): Promise<MatchSubstitution | undefined> {
    const existingMatchSubstitution = this.matchSubstitutions.get(id);
    if (!existingMatchSubstitution) {
      return undefined;
    }
    const updatedMatchSubstitution: MatchSubstitution = {
      ...existingMatchSubstitution,
      ...substitutionData
    };
    this.matchSubstitutions.set(id, updatedMatchSubstitution);
    return updatedMatchSubstitution;
  }

  async deleteMatchSubstitution(id: number): Promise<boolean> {
    return this.matchSubstitutions.delete(id);
  }

  // MatchGoal methods
  async getMatchGoals(matchId: number): Promise<MatchGoal[]> {
    return Array.from(this.matchGoals.values()).filter(
      goal => goal.matchId === matchId
    );
  }

  async createMatchGoal(goalData: InsertMatchGoal): Promise<MatchGoal> {
    const id = this.currentIds.matchGoals++;
    const now = new Date();
    const matchGoal: MatchGoal = {
      ...goalData,
      id,
      createdAt: now
    } as MatchGoal;
    this.matchGoals.set(id, matchGoal);
    return matchGoal;
  }

  async updateMatchGoal(id: number, goalData: Partial<MatchGoal>): Promise<MatchGoal | undefined> {
    const existingMatchGoal = this.matchGoals.get(id);
    if (!existingMatchGoal) {
      return undefined;
    }
    const updatedMatchGoal: MatchGoal = {
      ...existingMatchGoal,
      ...goalData
    };
    this.matchGoals.set(id, updatedMatchGoal);
    return updatedMatchGoal;
  }

  async deleteMatchGoal(id: number): Promise<boolean> {
    return this.matchGoals.delete(id);
  }

  // MatchCard methods
  async getMatchCards(matchId: number): Promise<MatchCard[]> {
    return Array.from(this.matchCards.values()).filter(
      card => card.matchId === matchId
    );
  }

  async createMatchCard(cardData: InsertMatchCard): Promise<MatchCard> {
    const id = this.currentIds.matchCards++;
    const now = new Date();
    const matchCard: MatchCard = {
      ...cardData,
      id,
      createdAt: now
    } as MatchCard;
    this.matchCards.set(id, matchCard);
    return matchCard;
  }

  async updateMatchCard(id: number, cardData: Partial<MatchCard>): Promise<MatchCard | undefined> {
    const existingMatchCard = this.matchCards.get(id);
    if (!existingMatchCard) {
      return undefined;
    }
    const updatedMatchCard: MatchCard = {
      ...existingMatchCard,
      ...cardData
    };
    this.matchCards.set(id, updatedMatchCard);
    return updatedMatchCard;
  }

  async deleteMatchCard(id: number): Promise<boolean> {
    return this.matchCards.delete(id);
  }

  // MatchPhoto methods
  async getMatchPhoto(id: number): Promise<MatchPhoto | undefined> {
    return this.matchPhotos.get(id);
  }

  async getMatchPhotos(matchId: number): Promise<MatchPhoto[]> {
    return Array.from(this.matchPhotos.values()).filter(
      photo => photo.matchId === matchId
    );
  }

  async createMatchPhoto(photoData: InsertMatchPhoto): Promise<MatchPhoto> {
    const id = this.currentIds.matchPhotos++;
    const now = new Date();
    const matchPhoto: MatchPhoto = {
      ...photoData,
      id,
      createdAt: now
    } as MatchPhoto;
    this.matchPhotos.set(id, matchPhoto);
    return matchPhoto;
  }

  async updateMatchPhoto(id: number, photoData: Partial<MatchPhoto>): Promise<MatchPhoto | undefined> {
    const existingMatchPhoto = this.matchPhotos.get(id);
    if (!existingMatchPhoto) {
      return undefined;
    }
    const updatedMatchPhoto: MatchPhoto = {
      ...existingMatchPhoto,
      ...photoData
    };
    this.matchPhotos.set(id, updatedMatchPhoto);
    return updatedMatchPhoto;
  }

  async deleteMatchPhoto(id: number): Promise<boolean> {
    return this.matchPhotos.delete(id);
  }

  // LeagueClassification methods
  async getLeagueClassifications(teamId: number): Promise<LeagueClassification[]> {
    return Array.from(this.leagueClassifications.values()).filter(
      classification => classification.teamId === teamId
    );
  }

  async getLeagueClassification(id: number): Promise<LeagueClassification | undefined> {
    return this.leagueClassifications.get(id);
  }

  async createLeagueClassification(classificationData: InsertLeagueClassification): Promise<LeagueClassification> {
    const id = this.currentIds.leagueClassifications++;
    const now = new Date();
    const leagueClassification: LeagueClassification = {
      ...classificationData,
      id,
      updatedAt: now
    } as LeagueClassification;
    this.leagueClassifications.set(id, leagueClassification);
    return leagueClassification;
  }

  async updateLeagueClassification(id: number, classificationData: Partial<LeagueClassification>): Promise<LeagueClassification | undefined> {
    const existingLeagueClassification = this.leagueClassifications.get(id);
    if (!existingLeagueClassification) {
      return undefined;
    }
    const updatedLeagueClassification: LeagueClassification = {
      ...existingLeagueClassification,
      ...classificationData,
      updatedAt: new Date()
    };
    this.leagueClassifications.set(id, updatedLeagueClassification);
    return updatedLeagueClassification;
  }

  async deleteLeagueClassification(id: number): Promise<boolean> {
    return this.leagueClassifications.delete(id);
  }

  async bulkCreateLeagueClassifications(classificationsData: InsertLeagueClassification[]): Promise<LeagueClassification[]> {
    const now = new Date();
    const createdClassifications: LeagueClassification[] = [];
    
    for (const classificationData of classificationsData) {
      const id = this.currentIds.leagueClassifications++;
      const leagueClassification: LeagueClassification = {
        ...classificationData,
        id,
        updatedAt: now
      } as LeagueClassification;
      this.leagueClassifications.set(id, leagueClassification);
      createdClassifications.push(leagueClassification);
    }
    
    return createdClassifications;
  }

  async deleteAllTeamClassifications(teamId: number): Promise<boolean> {
    const classificationsToDelete = Array.from(this.leagueClassifications.values())
      .filter(classification => classification.teamId === teamId);
    
    for (const classification of classificationsToDelete) {
      this.leagueClassifications.delete(classification.id);
    }
    
    return true;
  }

  async getTeamClassifications(teamId: number): Promise<LeagueClassification[]> {
    return this.getLeagueClassifications(teamId);
  }
}

// Create an instance of the memory storage for use in the application
export const storage = new MemStorage();
