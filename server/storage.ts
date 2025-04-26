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
import { sessionStore } from "./session";

// Define the storage interface that both implementations must follow
export interface IStorage {
  // Session store for authentication
  sessionStore: typeof sessionStore;
  
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(userData: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Team management
  getTeam(id: number): Promise<Team | undefined>;
  getTeams(): Promise<Team[]>;
  getTeamsByUserId(userId: number): Promise<Team[]>;
  getTeamByJoinCode(joinCode: string): Promise<Team | undefined>;
  createTeam(teamData: InsertTeam): Promise<Team>;
  updateTeam(id: number, teamData: Partial<Team>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;
  
  // Team member management
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  getTeamMember(teamId: number, userId: number): Promise<TeamMember | undefined>;
  getTeamMembersByUserId(userId: number): Promise<TeamMember[]>;
  createTeamMember(teamMemberData: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: number, teamMemberData: Partial<TeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: number): Promise<boolean>;
  
  // Match management
  getMatch(id: number): Promise<Match | undefined>;
  getMatches(teamId: number): Promise<Match[]>;
  getRecentMatches(teamId: number, limit: number): Promise<Match[]>;
  createMatch(matchData: InsertMatch): Promise<Match>;
  updateMatch(id: number, matchData: Partial<Match>): Promise<Match | undefined>;
  
  // Event management
  getEvent(id: number): Promise<Event | undefined>;
  getEvents(teamId: number): Promise<Event[]>;
  getUpcomingEvents(teamId: number, limit: number): Promise<Event[]>;
  createEvent(eventData: InsertEvent): Promise<Event>;
  updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  
  // Attendance management
  getAttendance(eventId: number): Promise<Attendance[]>;
  getUserAttendance(userId: number): Promise<Attendance[]>;
  createAttendance(attendanceData: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, attendanceData: Partial<Attendance>): Promise<Attendance | undefined>;
  
  // Player stats management
  getPlayerStats(userId: number): Promise<PlayerStat[]>;
  getMatchPlayerStats(matchId: number): Promise<PlayerStat[]>;
  createPlayerStat(playerStatData: InsertPlayerStat): Promise<PlayerStat>;
  updatePlayerStat(id: number, playerStatData: Partial<PlayerStat>): Promise<PlayerStat | undefined>;
  
  // Announcement management
  getAnnouncement(id: number): Promise<Announcement | undefined>;
  getAnnouncements(teamId: number): Promise<Announcement[]>;
  getRecentAnnouncements(teamId: number, limit: number): Promise<Announcement[]>;
  createAnnouncement(announcementData: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: number, announcementData: Partial<Announcement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: number): Promise<boolean>;
  
  // Invitation management
  getInvitation(id: number): Promise<Invitation | undefined>;
  getInvitations(teamId: number): Promise<Invitation[]>;
  createInvitation(invitationData: InsertInvitation): Promise<Invitation>;
  updateInvitation(id: number, invitationData: Partial<Invitation>): Promise<Invitation | undefined>;
  
  // Match lineup management
  getMatchLineup(matchId: number): Promise<MatchLineup | undefined>;
  createMatchLineup(lineupData: InsertMatchLineup): Promise<MatchLineup>;
  updateMatchLineup(id: number, lineupData: Partial<MatchLineup>): Promise<MatchLineup | undefined>;
  
  // Team lineup management
  getTeamLineup(teamId: number): Promise<TeamLineup | undefined>;
  createTeamLineup(lineupData: InsertTeamLineup): Promise<TeamLineup>;
  updateTeamLineup(id: number, lineupData: Partial<TeamLineup>): Promise<TeamLineup | undefined>;
  
  // Match substitution management
  getMatchSubstitutions(matchId: number): Promise<MatchSubstitution[]>;
  createMatchSubstitution(substitutionData: InsertMatchSubstitution): Promise<MatchSubstitution>;
  updateMatchSubstitution(id: number, substitutionData: Partial<MatchSubstitution>): Promise<MatchSubstitution | undefined>;
  deleteMatchSubstitution(id: number): Promise<boolean>;
  
  // Match goal management
  getMatchGoals(matchId: number): Promise<MatchGoal[]>;
  createMatchGoal(goalData: InsertMatchGoal): Promise<MatchGoal>;
  updateMatchGoal(id: number, goalData: Partial<MatchGoal>): Promise<MatchGoal | undefined>;
  deleteMatchGoal(id: number): Promise<boolean>;
  
  // Match card management
  getMatchCards(matchId: number): Promise<MatchCard[]>;
  createMatchCard(cardData: InsertMatchCard): Promise<MatchCard>;
  updateMatchCard(id: number, cardData: Partial<MatchCard>): Promise<MatchCard | undefined>;
  deleteMatchCard(id: number): Promise<boolean>;
  
  // Match photo management
  getMatchPhoto(id: number): Promise<MatchPhoto | undefined>;
  getMatchPhotos(matchId: number): Promise<MatchPhoto[]>;
  createMatchPhoto(photoData: InsertMatchPhoto): Promise<MatchPhoto>;
  updateMatchPhoto(id: number, photoData: Partial<MatchPhoto>): Promise<MatchPhoto | undefined>;
  deleteMatchPhoto(id: number): Promise<boolean>;
  
  // League classification management
  getLeagueClassifications(teamId: number): Promise<LeagueClassification[]>;
  getLeagueClassification(id: number): Promise<LeagueClassification | undefined>;
  createLeagueClassification(classificationData: InsertLeagueClassification): Promise<LeagueClassification>;
  updateLeagueClassification(id: number, classificationData: Partial<LeagueClassification>): Promise<LeagueClassification | undefined>;
  deleteLeagueClassification(id: number): Promise<boolean>;
  bulkCreateLeagueClassifications(classificationsData: InsertLeagueClassification[]): Promise<LeagueClassification[]>;
  deleteAllTeamClassifications(teamId: number): Promise<boolean>;
  getTeamClassifications(teamId: number): Promise<LeagueClassification[]>;
  findClassificationById(id: number): Promise<LeagueClassification | undefined>;
  createClassification(teamId: number, classificationData: Partial<InsertLeagueClassification>): Promise<LeagueClassification>;
  updateClassification(id: number, classificationData: Partial<LeagueClassification>): Promise<LeagueClassification | undefined>;
  deleteClassification(id: number): Promise<boolean>;
}

// Import the full database storage implementation
import { DatabaseStorage } from "./database-storage";

// Export the storage instance
export const storage = new DatabaseStorage();