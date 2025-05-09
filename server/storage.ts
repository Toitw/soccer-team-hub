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
  leagueClassification, type LeagueClassification, type InsertLeagueClassification,
  seasons, type Season, type InsertSeason
} from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";
import { Store as SessionStore } from "express-session";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const MemoryStore = createMemoryStore(session);

// File paths for data persistence
const DATA_DIR = './data';
const TEAM_MEMBERS_FILE = path.join(DATA_DIR, 'team_members.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MATCHES_FILE = path.join(DATA_DIR, 'matches.json');
const ANNOUNCEMENTS_FILE = path.join(DATA_DIR, 'announcements.json');
const TEAMS_FILE = path.join(DATA_DIR, 'teams.json');
const MATCH_LINEUPS_FILE = path.join(DATA_DIR, 'match_lineups.json');
const TEAM_LINEUPS_FILE = path.join(DATA_DIR, 'team_lineups.json');
const MATCH_SUBSTITUTIONS_FILE = path.join(DATA_DIR, 'match_substitutions.json');
const MATCH_GOALS_FILE = path.join(DATA_DIR, 'match_goals.json');
const MATCH_CARDS_FILE = path.join(DATA_DIR, 'match_cards.json');
const MATCH_PHOTOS_FILE = path.join(DATA_DIR, 'match_photos.json');
const LEAGUE_CLASSIFICATION_FILE = path.join(DATA_DIR, 'league_classification.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

// Use the SessionStore type from express-session for proper compatibility
type SessionStoreType = SessionStore;

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
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Team methods
  getTeam(id: number): Promise<Team | undefined>;
  getTeams(): Promise<Team[]>;
  getTeamsByUserId(userId: number): Promise<Team[]>;
  getTeamByJoinCode(joinCode: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, teamData: Partial<Team>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;
  
  // TeamMember methods
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  getTeamMember(teamId: number, userId: number): Promise<TeamMember | undefined>;
  getTeamMembersByUserId(userId: number): Promise<TeamMember[]>;
  createTeamMember(teamMember: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: number, teamMemberData: Partial<TeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: number): Promise<boolean>;
  
  // Match methods
  getMatch(id: number): Promise<Match | undefined>;
  getMatches(teamId: number): Promise<Match[]>;
  getRecentMatches(teamId: number, limit: number): Promise<Match[]>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: number, matchData: Partial<Match>): Promise<Match | undefined>;
  deleteMatch(id: number): Promise<boolean>;
  
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
  updateAnnouncement(id: number, announcementData: Partial<Announcement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: number): Promise<boolean>;
  
  // Invitation methods
  getInvitation(id: number): Promise<Invitation | undefined>;
  getInvitations(teamId: number): Promise<Invitation[]>;
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  updateInvitation(id: number, invitationData: Partial<Invitation>): Promise<Invitation | undefined>;

  // Match Lineup methods
  getMatchLineup(matchId: number): Promise<MatchLineup | undefined>;
  createMatchLineup(lineup: InsertMatchLineup): Promise<MatchLineup>;
  updateMatchLineup(id: number, lineupData: Partial<MatchLineup>): Promise<MatchLineup | undefined>;
  
  // Team Lineup methods
  getTeamLineup(teamId: number): Promise<TeamLineup | undefined>;
  createTeamLineup(lineup: InsertTeamLineup): Promise<TeamLineup>;
  updateTeamLineup(id: number, lineupData: Partial<TeamLineup>): Promise<TeamLineup | undefined>;
  
  // Match Substitution methods
  getMatchSubstitutions(matchId: number): Promise<MatchSubstitution[]>;
  createMatchSubstitution(substitution: InsertMatchSubstitution): Promise<MatchSubstitution>;
  updateMatchSubstitution(id: number, substitutionData: Partial<MatchSubstitution>): Promise<MatchSubstitution | undefined>;
  deleteMatchSubstitution(id: number): Promise<boolean>;
  
  // Match Goal methods
  getMatchGoals(matchId: number): Promise<MatchGoal[]>;
  createMatchGoal(goal: InsertMatchGoal): Promise<MatchGoal>;
  updateMatchGoal(id: number, goalData: Partial<MatchGoal>): Promise<MatchGoal | undefined>;
  deleteMatchGoal(id: number): Promise<boolean>;

  // Match Card methods
  getMatchCards(matchId: number): Promise<MatchCard[]>;
  createMatchCard(card: InsertMatchCard): Promise<MatchCard>;
  updateMatchCard(id: number, cardData: Partial<MatchCard>): Promise<MatchCard | undefined>;
  deleteMatchCard(id: number): Promise<boolean>;

  // Match Photo methods
  getMatchPhoto(id: number): Promise<MatchPhoto | undefined>;
  getMatchPhotos(matchId: number): Promise<MatchPhoto[]>;
  createMatchPhoto(photo: InsertMatchPhoto): Promise<MatchPhoto>;
  updateMatchPhoto(id: number, photoData: Partial<MatchPhoto>): Promise<MatchPhoto | undefined>;
  deleteMatchPhoto(id: number): Promise<boolean>;
  
  // League Classification methods
  getLeagueClassifications(teamId: number): Promise<LeagueClassification[]>;
  getLeagueClassification(id: number): Promise<LeagueClassification | undefined>;
  createLeagueClassification(classification: InsertLeagueClassification): Promise<LeagueClassification>;
  updateLeagueClassification(id: number, classificationData: Partial<LeagueClassification>): Promise<LeagueClassification | undefined>;
  deleteLeagueClassification(id: number): Promise<boolean>;
  bulkCreateLeagueClassifications(classifications: InsertLeagueClassification[]): Promise<LeagueClassification[]>;
  deleteAllTeamClassifications(teamId: number): Promise<boolean>;
  
  // Aliases for classification methods that match our API endpoints
  getTeamClassifications(teamId: number): Promise<LeagueClassification[]>;
  findClassificationById(id: number): Promise<LeagueClassification | undefined>;
  createClassification(teamId: number, classification: Partial<InsertLeagueClassification>): Promise<LeagueClassification>;
  updateClassification(id: number, classificationData: Partial<LeagueClassification>): Promise<LeagueClassification | undefined>;
  deleteClassification(id: number): Promise<boolean>;
  
  // Season methods
  getSeasons(teamId: number): Promise<Season[]>;
  getSeason(id: number): Promise<Season | undefined>;
  getActiveSeasons(teamId: number): Promise<Season[]>;
  createSeason(seasonData: InsertSeason): Promise<Season>;
  updateSeason(id: number, seasonData: Partial<Season>): Promise<Season | undefined>;
  deleteSeason(id: number): Promise<boolean>;
  finishSeason(id: number): Promise<Season | undefined>;
  
  // Enhanced League Classification methods
  getLeagueClassificationsBySeason(teamId: number, seasonId: number): Promise<LeagueClassification[]>;
  
  // Session store for authentication
  sessionStore: SessionStore;
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
  private matchLineups: Map<number, MatchLineup>;
  private teamLineups: Map<number, TeamLineup>;
  private matchSubstitutions: Map<number, MatchSubstitution>;
  private matchGoals: Map<number, MatchGoal>;
  private matchCards: Map<number, MatchCard>;
  private matchPhotos: Map<number, MatchPhoto>;
  private leagueClassifications: Map<number, LeagueClassification>;
  private seasons: Map<number, Season>;
  
  sessionStore: SessionStore;
  
  private userCurrentId: number;
  private teamCurrentId: number;
  private teamMemberCurrentId: number;
  private matchCurrentId: number;
  private eventCurrentId: number;
  private attendanceCurrentId: number;
  private playerStatCurrentId: number;
  private announcementCurrentId: number;
  private invitationCurrentId: number;
  private matchLineupCurrentId: number;
  private teamLineupCurrentId: number;
  private matchSubstitutionCurrentId: number;
  private matchGoalCurrentId: number;
  private matchCardCurrentId: number;
  private matchPhotoCurrentId: number;
  private leagueClassificationCurrentId: number;
  private seasonCurrentId: number;

  constructor() {
    // Ensure the data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Initialize maps
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
    
    this.userCurrentId = 1;
    this.teamCurrentId = 1;
    this.teamMemberCurrentId = 1;
    this.matchCurrentId = 1;
    this.eventCurrentId = 1;
    this.attendanceCurrentId = 1;
    this.playerStatCurrentId = 1;
    this.announcementCurrentId = 1;
    this.invitationCurrentId = 1;
    this.matchLineupCurrentId = 1;
    this.teamLineupCurrentId = 1;
    this.matchSubstitutionCurrentId = 1;
    this.matchGoalCurrentId = 1;
    this.matchCardCurrentId = 1;
    this.matchPhotoCurrentId = 1;
    this.leagueClassificationCurrentId = 1;
    this.seasonCurrentId = 1;

    // Initialize seasons map
    this.seasons = new Map();
    
    // Create a memory-based session store with 24-hour check period
    const store = new MemoryStore({
      checkPeriod: 86400000, // 24 hours in milliseconds
    });
    
    // Assign to sessionStore property (typing handled by interface)
    this.sessionStore = store;
    
    // Load persisted data from files
    const hasPersistedData = this.loadPersistedData();
    
    // Initialize with some data ONLY if no data exists
    if (!hasPersistedData) {
      this.initializeData().catch(err => {
        console.error("Error initializing data:", err);
      });
    }
  }
  
  // Helper method to load data from files
  private loadPersistedData(): boolean {
    try {
      let hasData = false;
      
      // Load user data if the file exists
      if (fs.existsSync(USERS_FILE)) {
        const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        
        if (usersData && usersData.length > 0) {
          hasData = true;
          
          // Clear current map and populate from file
          this.users.clear();
          let maxId = 0;
          
          // Process each user
          for (const user of usersData) {
            // Make sure user has a valid role (required by TypeScript)
            if (!user.role) {
              user.role = "player";
            }
            
            // Add to map
            this.users.set(user.id, user as User);
            
            // Track maximum ID
            if (user.id > maxId) {
              maxId = user.id;
            }
          }
          
          // Update the current ID counter
          this.userCurrentId = maxId + 1;
          
          console.log(`Loaded ${usersData.length} users from storage`);
        }
      }
      
      // Load teams data if the file exists
      if (fs.existsSync(TEAMS_FILE)) {
        const teamsData = JSON.parse(fs.readFileSync(TEAMS_FILE, 'utf8'));
        
        if (teamsData && teamsData.length > 0) {
          hasData = true;
          
          // Clear current map and populate from file
          this.teams.clear();
          let maxId = 0;
          
          // Process each team
          for (const team of teamsData) {
            // Add to map
            this.teams.set(team.id, team as Team);
            
            // Track maximum ID
            if (team.id > maxId) {
              maxId = team.id;
            }
          }
          
          // Update the current ID counter
          this.teamCurrentId = maxId + 1;
          
          console.log(`Loaded ${teamsData.length} teams from storage`);
        }
      }
      
      // Load team members if the file exists
      if (fs.existsSync(TEAM_MEMBERS_FILE)) {
        const teamMembersData = JSON.parse(fs.readFileSync(TEAM_MEMBERS_FILE, 'utf8'));
        
        if (teamMembersData && teamMembersData.length > 0) {
          hasData = true;
          
          // Clear current map and populate from file
          this.teamMembers.clear();
          let maxId = 0;
          
          // Process each team member
          for (const member of teamMembersData) {
            // Handle Date conversion (joinedAt is stored as a string in the file)
            if (member.joinedAt) {
              member.joinedAt = new Date(member.joinedAt);
            }
            
            // Make sure member has a valid role (required by TypeScript)
            if (!member.role) {
              member.role = "player";
            }
            
            // Add to map
            this.teamMembers.set(member.id, member as TeamMember);
            
            // Track maximum ID
            if (member.id > maxId) {
              maxId = member.id;
            }
          }
          
          // Update the current ID counter
          this.teamMemberCurrentId = maxId + 1;
          
          console.log(`Loaded ${teamMembersData.length} team members from storage`);
        }
      }

      // Load matches data if the file exists
      if (fs.existsSync(MATCHES_FILE)) {
        const matchesData = JSON.parse(fs.readFileSync(MATCHES_FILE, 'utf8'));
        
        if (matchesData && matchesData.length > 0) {
          hasData = true;
          
          // Clear current map and populate from file
          this.matches.clear();
          let maxId = 0;
          
          // Process each match
          for (const match of matchesData) {
            // Handle Date conversion (matchDate is stored as a string in the file)
            if (match.matchDate) {
              match.matchDate = new Date(match.matchDate);
            }
            
            // Make sure status is valid (required by TypeScript)
            if (!match.status) {
              match.status = "scheduled";
            }
            
            // Add to map
            this.matches.set(match.id, match as Match);
            
            // Track maximum ID
            if (match.id > maxId) {
              maxId = match.id;
            }
          }
          
          // Update the current ID counter
          this.matchCurrentId = maxId + 1;
          
          console.log(`Loaded ${matchesData.length} matches from storage`);
        }
      }
      
      // Load events data if the file exists
      if (fs.existsSync(EVENTS_FILE)) {
        const eventsData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
        
        if (eventsData && eventsData.length > 0) {
          hasData = true;
          
          // Clear current map and populate from file
          this.events.clear();
          let maxId = 0;
          
          // Process each event
          for (const event of eventsData) {
            // Handle Date conversion (startTime and endTime are stored as strings in the file)
            if (event.startTime) {
              event.startTime = new Date(event.startTime);
            }
            if (event.endTime) {
              event.endTime = new Date(event.endTime);
            }
            
            // Add to map
            this.events.set(event.id, event as Event);
            
            // Track maximum ID
            if (event.id > maxId) {
              maxId = event.id;
            }
          }
          
          // Update the current ID counter
          this.eventCurrentId = maxId + 1;
          
          console.log(`Loaded ${eventsData.length} events from storage`);
        }
      }
      
      // Load announcements data if the file exists
      if (fs.existsSync(ANNOUNCEMENTS_FILE)) {
        const announcementsData = JSON.parse(fs.readFileSync(ANNOUNCEMENTS_FILE, 'utf8'));
        
        if (announcementsData && announcementsData.length > 0) {
          hasData = true;
          
          // Clear current map and populate from file
          this.announcements.clear();
          let maxId = 0;
          
          // Process each announcement
          for (const announcement of announcementsData) {
            // Handle Date conversion (createdAt is stored as a string in the file)
            if (announcement.createdAt) {
              announcement.createdAt = new Date(announcement.createdAt);
            }
            
            // Add to map
            this.announcements.set(announcement.id, announcement as Announcement);
            
            // Track maximum ID
            if (announcement.id > maxId) {
              maxId = announcement.id;
            }
          }
          
          // Update the current ID counter
          this.announcementCurrentId = maxId + 1;
          
          console.log(`Loaded ${announcementsData.length} announcements from storage`);
        }
      }
      
      // Load match lineups data if the file exists
      if (fs.existsSync(MATCH_LINEUPS_FILE)) {
        const matchLineupsData = JSON.parse(fs.readFileSync(MATCH_LINEUPS_FILE, 'utf8'));
        
        if (matchLineupsData && matchLineupsData.length > 0) {
          hasData = true;
          
          // Clear current map and populate from file
          this.matchLineups.clear();
          let maxId = 0;
          
          // Process each match lineup
          for (const lineup of matchLineupsData) {
            // Handle Date conversion (createdAt is stored as a string in the file)
            if (lineup.createdAt) {
              lineup.createdAt = new Date(lineup.createdAt);
            }
            
            // Add to map
            this.matchLineups.set(lineup.id, lineup as MatchLineup);
            
            // Track maximum ID
            if (lineup.id > maxId) {
              maxId = lineup.id;
            }
          }
          
          // Update the current ID counter
          this.matchLineupCurrentId = maxId + 1;
          
          console.log(`Loaded ${matchLineupsData.length} match lineups from storage`);
        }
      }
      
      // Load team lineups data if the file exists
      if (fs.existsSync(TEAM_LINEUPS_FILE)) {
        const teamLineupsData = JSON.parse(fs.readFileSync(TEAM_LINEUPS_FILE, 'utf8'));
        
        if (teamLineupsData && teamLineupsData.length > 0) {
          hasData = true;
          
          // Clear current map and populate from file
          this.teamLineups.clear();
          let maxId = 0;
          
          // Process each team lineup
          for (const lineup of teamLineupsData) {
            // Handle Date conversion (createdAt is stored as a string in the file)
            if (lineup.createdAt) {
              lineup.createdAt = new Date(lineup.createdAt);
            }
            
            // Add to map
            this.teamLineups.set(lineup.id, lineup as TeamLineup);
            
            // Track maximum ID
            if (lineup.id > maxId) {
              maxId = lineup.id;
            }
          }
          
          // Update the current ID counter
          this.teamLineupCurrentId = maxId + 1;
          
          console.log(`Loaded ${teamLineupsData.length} team lineups from storage`);
        }
      }
      
      // Load match substitutions data if the file exists
      if (fs.existsSync(MATCH_SUBSTITUTIONS_FILE)) {
        const matchSubstitutionsData = JSON.parse(fs.readFileSync(MATCH_SUBSTITUTIONS_FILE, 'utf8'));
        
        if (matchSubstitutionsData && matchSubstitutionsData.length > 0) {
          hasData = true;
          
          // Clear current map and populate from file
          this.matchSubstitutions.clear();
          let maxId = 0;
          
          // Process each match substitution
          for (const substitution of matchSubstitutionsData) {
            // Add to map
            this.matchSubstitutions.set(substitution.id, substitution as MatchSubstitution);
            
            // Track maximum ID
            if (substitution.id > maxId) {
              maxId = substitution.id;
            }
          }
          
          // Update the current ID counter
          this.matchSubstitutionCurrentId = maxId + 1;
          
          console.log(`Loaded ${matchSubstitutionsData.length} match substitutions from storage`);
        }
      }
      
      // Load match goals data if the file exists
      if (fs.existsSync(MATCH_GOALS_FILE)) {
        const matchGoalsData = JSON.parse(fs.readFileSync(MATCH_GOALS_FILE, 'utf8'));
        
        if (matchGoalsData && matchGoalsData.length > 0) {
          hasData = true;
          
          // Clear current map and populate from file
          this.matchGoals.clear();
          let maxId = 0;
          
          // Process each match goal
          for (const goal of matchGoalsData) {
            // Add to map
            this.matchGoals.set(goal.id, goal as MatchGoal);
            
            // Track maximum ID
            if (goal.id > maxId) {
              maxId = goal.id;
            }
          }
          
          // Update the current ID counter
          this.matchGoalCurrentId = maxId + 1;
          
          console.log(`Loaded ${matchGoalsData.length} match goals from storage`);
        }
      }
      
      // Load match cards data if the file exists
      if (fs.existsSync(MATCH_CARDS_FILE)) {
        const matchCardsData = JSON.parse(fs.readFileSync(MATCH_CARDS_FILE, 'utf8'));
        
        if (matchCardsData && matchCardsData.length > 0) {
          hasData = true;
          
          // Clear current map and populate from file
          this.matchCards.clear();
          let maxId = 0;
          
          // Process each match card
          for (const card of matchCardsData) {
            // Add to map
            this.matchCards.set(card.id, card as MatchCard);
            
            // Track maximum ID
            if (card.id > maxId) {
              maxId = card.id;
            }
          }
          
          // Update the current ID counter
          this.matchCardCurrentId = maxId + 1;
          
          console.log(`Loaded ${matchCardsData.length} match cards from storage`);
        }
      }
      
      // Load match photos data if the file exists
      if (fs.existsSync(MATCH_PHOTOS_FILE)) {
        const matchPhotosData = JSON.parse(fs.readFileSync(MATCH_PHOTOS_FILE, 'utf8'));
        
        if (matchPhotosData && matchPhotosData.length > 0) {
          hasData = true;
          
          // Clear current map and populate from file
          this.matchPhotos.clear();
          let maxId = 0;
          
          // Process each match photo
          for (const photo of matchPhotosData) {
            // Add to map
            this.matchPhotos.set(photo.id, photo as MatchPhoto);
            
            // Track maximum ID
            if (photo.id > maxId) {
              maxId = photo.id;
            }
          }
          
          // Update the current ID counter
          this.matchPhotoCurrentId = maxId + 1;
          
          console.log(`Loaded ${matchPhotosData.length} match photos from storage`);
        }
      }
      
      // Load league classification data if the file exists
      if (fs.existsSync(LEAGUE_CLASSIFICATION_FILE)) {
        const leagueClassificationsData = JSON.parse(fs.readFileSync(LEAGUE_CLASSIFICATION_FILE, 'utf8'));
        
        if (leagueClassificationsData && leagueClassificationsData.length > 0) {
          hasData = true;
          
          // Clear current map and populate from file
          this.leagueClassifications.clear();
          let maxId = 0;
          
          // Process each league classification entry
          for (const classification of leagueClassificationsData) {
            // Handle Date conversion (createdAt and updatedAt are stored as strings in the file)
            if (classification.createdAt) {
              classification.createdAt = new Date(classification.createdAt);
            }
            if (classification.updatedAt) {
              classification.updatedAt = new Date(classification.updatedAt);
            }
            
            // Add to map
            this.leagueClassifications.set(classification.id, classification as LeagueClassification);
            
            // Track maximum ID
            if (classification.id > maxId) {
              maxId = classification.id;
            }
          }
          
          // Update the current ID counter
          this.leagueClassificationCurrentId = maxId + 1;
          
          console.log(`Loaded ${leagueClassificationsData.length} league classification entries from storage`);
        }
      }
      
      return hasData;
    } catch (error) {
      console.error("Error loading persisted data:", error);
      return false;
    }
  }
  
  // Helper method to save user data to file
  private saveUsersData() {
    try {
      // Convert Map to Array for JSON serialization
      const usersArray = Array.from(this.users.values());
      
      // Write to file
      fs.writeFileSync(USERS_FILE, JSON.stringify(usersArray, null, 2));
      console.log(`Saved ${usersArray.length} users to storage`);
    } catch (error) {
      console.error("Error saving users data:", error);
    }
  }
  
  // Helper method to save team members data to file
  private saveTeamMembersData() {
    try {
      // Convert Map to Array for JSON serialization
      const teamMembersArray = Array.from(this.teamMembers.values());
      
      // Write to file
      fs.writeFileSync(TEAM_MEMBERS_FILE, JSON.stringify(teamMembersArray, null, 2));
      console.log(`Saved ${teamMembersArray.length} team members to storage`);
    } catch (error) {
      console.error("Error saving team members data:", error);
    }
  }
  
  // Helper method to save matches data to file
  private saveMatchesData() {
    try {
      // Convert Map to Array for JSON serialization
      const matchesArray = Array.from(this.matches.values());
      
      // Write to file
      fs.writeFileSync(MATCHES_FILE, JSON.stringify(matchesArray, null, 2));
      console.log(`Saved ${matchesArray.length} matches to storage`);
    } catch (error) {
      console.error("Error saving matches data:", error);
    }
  }
  
  // Helper method to save events data to file
  private saveEventsData() {
    try {
      // Convert Map to Array for JSON serialization
      const eventsArray = Array.from(this.events.values());
      
      // Write to file
      fs.writeFileSync(EVENTS_FILE, JSON.stringify(eventsArray, null, 2));
      console.log(`Saved ${eventsArray.length} events to storage`);
    } catch (error) {
      console.error("Error saving events data:", error);
    }
  }
  
  // Helper method to save match lineups data to file
  private saveMatchLineupsData() {
    try {
      // Convert Map to Array for JSON serialization
      const matchLineupsArray = Array.from(this.matchLineups.values());
      
      // Write to file
      fs.writeFileSync(MATCH_LINEUPS_FILE, JSON.stringify(matchLineupsArray, null, 2));
      console.log(`Saved ${matchLineupsArray.length} match lineups to storage`);
    } catch (error) {
      console.error("Error saving match lineups data:", error);
    }
  }
  
  // Helper method to save team lineups data to file
  private saveTeamLineupsData() {
    try {
      // Convert Map to Array for JSON serialization
      const teamLineupsArray = Array.from(this.teamLineups.values());
      
      // Write to file
      fs.writeFileSync(TEAM_LINEUPS_FILE, JSON.stringify(teamLineupsArray, null, 2));
      console.log(`Saved ${teamLineupsArray.length} team lineups to storage`);
    } catch (error) {
      console.error("Error saving team lineups data:", error);
    }
  }
  
  // Helper method to save match substitutions data to file
  private saveMatchSubstitutionsData() {
    try {
      // Convert Map to Array for JSON serialization
      const matchSubstitutionsArray = Array.from(this.matchSubstitutions.values());
      
      // Write to file
      fs.writeFileSync(MATCH_SUBSTITUTIONS_FILE, JSON.stringify(matchSubstitutionsArray, null, 2));
      console.log(`Saved ${matchSubstitutionsArray.length} match substitutions to storage`);
    } catch (error) {
      console.error("Error saving match substitutions data:", error);
    }
  }
  
  // Helper method to save match goals data to file
  private saveMatchGoalsData() {
    try {
      // Convert Map to Array for JSON serialization
      const matchGoalsArray = Array.from(this.matchGoals.values());
      
      // Write to file
      fs.writeFileSync(MATCH_GOALS_FILE, JSON.stringify(matchGoalsArray, null, 2));
      console.log(`Saved ${matchGoalsArray.length} match goals to storage`);
    } catch (error) {
      console.error("Error saving match goals data:", error);
    }
  }
  
  // Helper method to save match cards data to file
  private saveMatchCardsData() {
    try {
      // Convert Map to Array for JSON serialization
      const matchCardsArray = Array.from(this.matchCards.values());
      
      // Write to file
      fs.writeFileSync(MATCH_CARDS_FILE, JSON.stringify(matchCardsArray, null, 2));
      console.log(`Saved ${matchCardsArray.length} match cards to storage`);
    } catch (error) {
      console.error("Error saving match cards data:", error);
    }
  }
  
  // Helper method to save match photos data to file
  private saveMatchPhotosData() {
    try {
      // Convert Map to Array for JSON serialization
      const matchPhotosArray = Array.from(this.matchPhotos.values());
      
      // Write to file
      fs.writeFileSync(MATCH_PHOTOS_FILE, JSON.stringify(matchPhotosArray, null, 2));
      console.log(`Saved ${matchPhotosArray.length} match photos to storage`);
    } catch (error) {
      console.error("Error saving match photos data:", error);
    }
  }
  
  // Helper method to save league classification data to file
  private saveLeagueClassificationsData() {
    try {
      // Convert Map to Array for JSON serialization
      const leagueClassificationsArray = Array.from(this.leagueClassifications.values());
      
      // Write to file
      fs.writeFileSync(LEAGUE_CLASSIFICATION_FILE, JSON.stringify(leagueClassificationsArray, null, 2));
      console.log(`Saved ${leagueClassificationsArray.length} league classification entries to storage`);
    } catch (error) {
      console.error("Error saving league classification data:", error);
    }
  }
  
  // Helper method to save teams data to file
  private saveTeamsData() {
    try {
      // Convert Map to Array for JSON serialization
      const teamsArray = Array.from(this.teams.values());
      
      // Write to file
      fs.writeFileSync(TEAMS_FILE, JSON.stringify(teamsArray, null, 2));
      console.log(`Saved ${teamsArray.length} teams to storage`);
    } catch (error) {
      console.error("Error saving teams data:", error);
    }
  }

  private async initializeData() {
    // The initializeData method is now empty because we're using the
    // standalone initialize-admin.js script to create the admin user
    // This prevents the automatic creation of mock users or teams on startup
    console.log("No automatic initialization performed - using initialize-admin.js instead");
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
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    // Ensure role is never undefined
    const role = insertUser.role || "player";
    
    // Create user with non-null required fields
    const user: User = { 
      ...insertUser, 
      id,
      role,
      profilePicture: insertUser.profilePicture || null,
      position: insertUser.position || null,
      jerseyNumber: insertUser.jerseyNumber || null,
      email: insertUser.email || null,
      phoneNumber: insertUser.phoneNumber || null
    };
    
    this.users.set(id, user);
    
    // Save users data to file
    this.saveUsersData();
    
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    // When updating a password, make sure it's properly hashed
    // Don't re-hash passwords that are already hashed (containing a dot separator)
    if (userData.password && !userData.password.includes('.')) {
      userData.password = await hashPasswordInStorage(userData.password);
    }
    
    const updatedUser: User = { ...user, ...userData };
    this.users.set(id, updatedUser);
    
    // Save users data to file
    this.saveUsersData();
    
    console.log('User updated:', id, updatedUser.fullName);
    
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    // First, get all team memberships for this user
    const teamMembers = await this.getTeamMembersByUserId(id);
    
    // Delete all team memberships
    let allDeleted = true;
    for (const member of teamMembers) {
      const deleted = await this.deleteTeamMember(member.id);
      if (!deleted) {
        allDeleted = false;
        console.error(`Failed to delete team member ${member.id} for user ${id}`);
      }
    }
    
    // Now delete the user
    const result = this.users.delete(id);
    
    // Save users data to file
    if (result) {
      this.saveUsersData();
    }
    
    return result;
  }

  // Team methods
  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async getTeamsByUserId(userId: number): Promise<Team[]> {
    // First, get all team memberships for this user
    const teamMemberEntries = Array.from(this.teamMembers.values()).filter(
      (member) => member.userId === userId
    );
    
    // Extract only the team IDs that this user is a member of
    const teamIds = teamMemberEntries.map((member) => member.teamId);
    
    // Return only teams where the user is a member
    return Array.from(this.teams.values()).filter(
      (team) => teamIds.includes(team.id)
    );
  }
  
  async getTeamByJoinCode(joinCode: string): Promise<Team | undefined> {
    // Return the team with the specified join code, if any
    return Array.from(this.teams.values()).find(
      (team) => team.joinCode === joinCode
    );
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const id = this.teamCurrentId++;
    
    // Ensure required fields have default values if not provided
    const team: Team = { 
      ...insertTeam, 
      id,
      logo: insertTeam.logo || null,
      division: insertTeam.division || null,
      seasonYear: insertTeam.seasonYear || null,
      joinCode: insertTeam.joinCode || null
    };
    
    this.teams.set(id, team);
    
    // Save teams data to file
    this.saveTeamsData();
    
    return team;
  }

  async updateTeam(id: number, teamData: Partial<Team>): Promise<Team | undefined> {
    const team = this.teams.get(id);
    if (!team) return undefined;
    
    const updatedTeam: Team = { ...team, ...teamData };
    this.teams.set(id, updatedTeam);
    
    // Save teams data to file
    this.saveTeamsData();
    
    return updatedTeam;
  }

  async deleteTeam(id: number): Promise<boolean> {
    // First, get all team members for this team
    const teamMembers = await this.getTeamMembers(id);
    
    // Delete all team members
    let allDeleted = true;
    for (const member of teamMembers) {
      const deleted = await this.deleteTeamMember(member.id);
      if (!deleted) {
        allDeleted = false;
        console.error(`Failed to delete team member ${member.id} for team ${id}`);
      }
    }
    
    // Delete all related matches
    const matches = await this.getMatches(id);
    for (const match of matches) {
      await this.deleteMatch(match.id);
    }
    
    // Delete all related events
    const events = await this.getEvents(id);
    for (const event of events) {
      await this.deleteEvent(event.id);
    }
    
    // Delete all related announcements
    const announcements = await this.getAnnouncements(id);
    for (const announcement of announcements) {
      await this.deleteAnnouncement(announcement.id);
    }
    
    // Delete all related league classifications
    await this.deleteAllTeamClassifications(id);
    
    // Now delete the team
    const result = this.teams.delete(id);
    
    // Save teams data to file
    if (result) {
      this.saveTeamsData();
    }
    
    return result;
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

  async getTeamMembersByUserId(userId: number): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values()).filter(
      (member) => member.userId === userId
    );
  }

  async createTeamMember(insertTeamMember: InsertTeamMember): Promise<TeamMember> {
    const id = this.teamMemberCurrentId++;
    // Make sure role is never undefined to satisfy TypeScript requirements
    const role = insertTeamMember.role || "player";
    
    const teamMember: TeamMember = { 
      ...insertTeamMember, 
      id, 
      joinedAt: new Date(),
      role // Override with default if undefined
    };
    
    this.teamMembers.set(id, teamMember);
    
    // Save team members data to file
    this.saveTeamMembersData();
    
    return teamMember;
  }

  async updateTeamMember(id: number, teamMemberData: Partial<TeamMember>): Promise<TeamMember | undefined> {
    const teamMember = this.teamMembers.get(id);
    if (!teamMember) return undefined;
    
    const updatedTeamMember: TeamMember = { ...teamMember, ...teamMemberData };
    this.teamMembers.set(id, updatedTeamMember);
    
    // Save team members data to file
    this.saveTeamMembersData();
    
    return updatedTeamMember;
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    const result = this.teamMembers.delete(id);
    
    // Save team members data to file after deletion
    if (result) {
      this.saveTeamMembersData();
    }
    
    return result;
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
    
    // Ensure required fields have default values if not provided
    const match: Match = { 
      ...insertMatch, 
      id,
      status: insertMatch.status || "scheduled", 
      opponentLogo: insertMatch.opponentLogo || null,
      goalsScored: insertMatch.goalsScored || null,
      goalsConceded: insertMatch.goalsConceded || null,
      notes: insertMatch.notes || null
    };
    
    this.matches.set(id, match);
    
    // Save matches to file
    this.saveMatchesData();
    
    return match;
  }

  async updateMatch(id: number, matchData: Partial<Match>): Promise<Match | undefined> {
    const match = this.matches.get(id);
    if (!match) return undefined;
    
    const updatedMatch: Match = { ...match, ...matchData };
    this.matches.set(id, updatedMatch);
    
    // Save matches to file
    this.saveMatchesData();
    
    return updatedMatch;
  }
  
  // Delete a match - adding this method for match persistence
  async deleteMatch(id: number): Promise<boolean> {
    const result = this.matches.delete(id);
    
    // Save matches data to file after deletion
    if (result) {
      this.saveMatchesData();
    }
    
    return result;
  }
  
  // Helper method to save team lineups to file
  private saveTeamLineupsData() {
    try {
      // Convert Map to Array for JSON serialization
      const teamLineupsArray = Array.from(this.teamLineups.values());
      
      // Write to file
      fs.writeFileSync(TEAM_LINEUPS_FILE, JSON.stringify(teamLineupsArray, null, 2));
      console.log(`Saved ${teamLineupsArray.length} team lineups to storage`);
    } catch (error) {
      console.error("Error saving team lineups data:", error);
    }
  }

  // Match Lineup methods
  async getMatchLineup(matchId: number): Promise<MatchLineup | undefined> {
    return Array.from(this.matchLineups.values()).find(
      (lineup) => lineup.matchId === matchId
    );
  }

  async createMatchLineup(lineup: InsertMatchLineup): Promise<MatchLineup> {
    const id = this.matchLineupCurrentId++;
    
    const matchLineup: MatchLineup = { 
      ...lineup, 
      id,
      formation: lineup.formation || null,
      createdAt: new Date() 
    };
    
    this.matchLineups.set(id, matchLineup);
    
    // Save match lineups to file
    this.saveMatchLineupsData();
    
    return matchLineup;
  }

  async updateMatchLineup(id: number, lineupData: Partial<MatchLineup>): Promise<MatchLineup | undefined> {
    const lineup = this.matchLineups.get(id);
    if (!lineup) return undefined;
    
    const updatedLineup: MatchLineup = { ...lineup, ...lineupData };
    this.matchLineups.set(id, updatedLineup);
    
    // Save match lineups to file
    this.saveMatchLineupsData();
    
    return updatedLineup;
  }
  
  // Team Lineup methods
  async getTeamLineup(teamId: number): Promise<TeamLineup | undefined> {
    return Array.from(this.teamLineups.values()).find(
      (lineup) => lineup.teamId === teamId
    );
  }

  async createTeamLineup(lineup: InsertTeamLineup): Promise<TeamLineup> {
    const id = this.teamLineupCurrentId++;
    
    const teamLineup: TeamLineup = { 
      ...lineup, 
      id,
      formation: lineup.formation,
      playerIds: lineup.playerIds || [],
      benchPlayerIds: lineup.benchPlayerIds || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.teamLineups.set(id, teamLineup);
    
    // Save team lineups to file
    this.saveTeamLineupsData();
    
    return teamLineup;
  }

  async updateTeamLineup(id: number, lineupData: Partial<TeamLineup>): Promise<TeamLineup | undefined> {
    const lineup = this.teamLineups.get(id);
    if (!lineup) return undefined;
    
    const updatedLineup: TeamLineup = { 
      ...lineup, 
      ...lineupData,
      updatedAt: new Date()
    };
    this.teamLineups.set(id, updatedLineup);
    
    // Save team lineups to file
    this.saveTeamLineupsData();
    
    return updatedLineup;
  }

  // Match Substitution methods
  async getMatchSubstitutions(matchId: number): Promise<MatchSubstitution[]> {
    return Array.from(this.matchSubstitutions.values()).filter(
      (sub) => sub.matchId === matchId
    );
  }

  async createMatchSubstitution(substitution: InsertMatchSubstitution): Promise<MatchSubstitution> {
    const id = this.matchSubstitutionCurrentId++;
    
    const matchSubstitution: MatchSubstitution = { 
      ...substitution, 
      id,
      reason: substitution.reason || null
    };
    
    this.matchSubstitutions.set(id, matchSubstitution);
    
    // Save match substitutions to file
    this.saveMatchSubstitutionsData();
    
    return matchSubstitution;
  }

  async updateMatchSubstitution(id: number, substitutionData: Partial<MatchSubstitution>): Promise<MatchSubstitution | undefined> {
    const substitution = this.matchSubstitutions.get(id);
    if (!substitution) return undefined;
    
    const updatedSubstitution: MatchSubstitution = { ...substitution, ...substitutionData };
    this.matchSubstitutions.set(id, updatedSubstitution);
    
    // Save match substitutions to file
    this.saveMatchSubstitutionsData();
    
    return updatedSubstitution;
  }

  async deleteMatchSubstitution(id: number): Promise<boolean> {
    const result = this.matchSubstitutions.delete(id);
    
    // Save match substitutions to file if deleted
    if (result) {
      this.saveMatchSubstitutionsData();
    }
    
    return result;
  }

  // Match Goal methods
  async getMatchGoals(matchId: number): Promise<MatchGoal[]> {
    return Array.from(this.matchGoals.values()).filter(
      (goal) => goal.matchId === matchId
    );
  }

  async createMatchGoal(goal: InsertMatchGoal): Promise<MatchGoal> {
    const id = this.matchGoalCurrentId++;
    
    const matchGoal: MatchGoal = { 
      ...goal, 
      id,
      type: goal.type || "regular",
      description: goal.description || null,
      assistId: goal.assistId || null
    };
    
    this.matchGoals.set(id, matchGoal);
    
    // Save match goals to file
    this.saveMatchGoalsData();
    
    return matchGoal;
  }

  async updateMatchGoal(id: number, goalData: Partial<MatchGoal>): Promise<MatchGoal | undefined> {
    const goal = this.matchGoals.get(id);
    if (!goal) return undefined;
    
    const updatedGoal: MatchGoal = { ...goal, ...goalData };
    this.matchGoals.set(id, updatedGoal);
    
    // Save match goals to file
    this.saveMatchGoalsData();
    
    return updatedGoal;
  }

  async deleteMatchGoal(id: number): Promise<boolean> {
    const result = this.matchGoals.delete(id);
    
    // Save match goals to file if deleted
    if (result) {
      this.saveMatchGoalsData();
    }
    
    return result;
  }

  // Match Card methods
  async getMatchCards(matchId: number): Promise<MatchCard[]> {
    return Array.from(this.matchCards.values()).filter(
      (card) => card.matchId === matchId
    );
  }

  async createMatchCard(card: InsertMatchCard): Promise<MatchCard> {
    const id = this.matchCardCurrentId++;
    
    const matchCard: MatchCard = { 
      ...card, 
      id,
      reason: card.reason || null
    };
    
    this.matchCards.set(id, matchCard);
    
    // Save match cards to file
    this.saveMatchCardsData();
    
    return matchCard;
  }

  async updateMatchCard(id: number, cardData: Partial<MatchCard>): Promise<MatchCard | undefined> {
    const card = this.matchCards.get(id);
    if (!card) return undefined;
    
    const updatedCard: MatchCard = { ...card, ...cardData };
    this.matchCards.set(id, updatedCard);
    
    // Save match cards to file
    this.saveMatchCardsData();
    
    return updatedCard;
  }

  async deleteMatchCard(id: number): Promise<boolean> {
    const result = this.matchCards.delete(id);
    
    // Save match cards to file if deleted
    if (result) {
      this.saveMatchCardsData();
    }
    
    return result;
  }

  // Match Photo methods
  async getMatchPhoto(id: number): Promise<MatchPhoto | undefined> {
    return this.matchPhotos.get(id);
  }

  async getMatchPhotos(matchId: number): Promise<MatchPhoto[]> {
    return Array.from(this.matchPhotos.values()).filter(
      (photo) => photo.matchId === matchId
    );
  }

  async createMatchPhoto(photo: InsertMatchPhoto): Promise<MatchPhoto> {
    const id = this.matchPhotoCurrentId++;
    
    const matchPhoto: MatchPhoto = { 
      ...photo, 
      id,
      caption: photo.caption || null,
      uploadedAt: new Date() 
    };
    
    this.matchPhotos.set(id, matchPhoto);
    
    // Save match photos to file
    this.saveMatchPhotosData();
    
    return matchPhoto;
  }

  async updateMatchPhoto(id: number, photoData: Partial<MatchPhoto>): Promise<MatchPhoto | undefined> {
    const photo = this.matchPhotos.get(id);
    if (!photo) return undefined;
    
    const updatedPhoto: MatchPhoto = { ...photo, ...photoData };
    this.matchPhotos.set(id, updatedPhoto);
    
    // Save match photos to file
    this.saveMatchPhotosData();
    
    return updatedPhoto;
  }

  async deleteMatchPhoto(id: number): Promise<boolean> {
    const result = this.matchPhotos.delete(id);
    
    // Save match photos to file if deleted
    if (result) {
      this.saveMatchPhotosData();
    }
    
    return result;
  }
  
  // League Classification methods
  async getLeagueClassifications(teamId: number): Promise<LeagueClassification[]> {
    return Array.from(this.leagueClassifications.values())
      .filter(classification => classification.teamId === teamId)
      .sort((a, b) => (a.position || 999) - (b.position || 999)); // Sort by position if available
  }
  
  async getLeagueClassification(id: number): Promise<LeagueClassification | undefined> {
    return this.leagueClassifications.get(id);
  }
  
  async createLeagueClassification(classification: InsertLeagueClassification): Promise<LeagueClassification> {
    const id = this.leagueClassificationCurrentId++;
    const now = new Date();
    
    const leagueClassification: LeagueClassification = {
      ...classification,
      id,
      position: classification.position || null,
      gamesPlayed: classification.gamesPlayed || 0,
      gamesWon: classification.gamesWon || 0,
      gamesDrawn: classification.gamesDrawn || 0,
      gamesLost: classification.gamesLost || 0,
      goalsFor: classification.goalsFor || 0,
      goalsAgainst: classification.goalsAgainst || 0,
      createdAt: now,
      updatedAt: now
    };
    
    this.leagueClassifications.set(id, leagueClassification);
    
    // Save league classifications to file
    this.saveLeagueClassificationsData();
    
    return leagueClassification;
  }
  
  async updateLeagueClassification(id: number, classificationData: Partial<LeagueClassification>): Promise<LeagueClassification | undefined> {
    const classification = this.leagueClassifications.get(id);
    if (!classification) return undefined;
    
    const updatedClassification: LeagueClassification = { 
      ...classification, 
      ...classificationData,
      updatedAt: new Date() // Always update the updatedAt timestamp
    };
    
    this.leagueClassifications.set(id, updatedClassification);
    
    // Save league classifications to file
    this.saveLeagueClassificationsData();
    
    return updatedClassification;
  }
  
  async deleteLeagueClassification(id: number): Promise<boolean> {
    const result = this.leagueClassifications.delete(id);
    
    // Save league classifications to file if deleted
    if (result) {
      this.saveLeagueClassificationsData();
    }
    
    return result;
  }
  
  async bulkCreateLeagueClassifications(classifications: InsertLeagueClassification[]): Promise<LeagueClassification[]> {
    const createdClassifications: LeagueClassification[] = [];
    
    for (const classification of classifications) {
      const created = await this.createLeagueClassification(classification);
      createdClassifications.push(created);
    }
    
    return createdClassifications;
  }
  
  async deleteAllTeamClassifications(teamId: number): Promise<boolean> {
    // Find all classifications for this team
    const teamClassifications = await this.getLeagueClassifications(teamId);
    
    // Delete each one
    let deletedCount = 0;
    for (const classification of teamClassifications) {
      const deleted = await this.deleteLeagueClassification(classification.id);
      if (deleted) deletedCount++;
    }
    
    // Return true if we deleted anything
    return deletedCount > 0;
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
    // Ensure all required fields have values to satisfy TypeScript
    const event: Event = { 
      ...insertEvent, 
      id,
      endTime: insertEvent.endTime || null,
      description: insertEvent.description || null
    };
    this.events.set(id, event);
    
    // Save events data to file
    this.saveEventsData();
    
    return event;
  }

  async updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    
    const updatedEvent: Event = { ...event, ...eventData };
    this.events.set(id, updatedEvent);
    
    // Save events data to file
    this.saveEventsData();
    
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    const result = this.events.delete(id);
    
    // Save events data to file after deletion
    if (result) {
      this.saveEventsData();
    }
    
    return result;
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
    // Ensure status is set to satisfy TypeScript
    const status = insertAttendance.status || "pending";
    const attendance: Attendance = { 
      ...insertAttendance, 
      id,
      status
    };
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
    // Ensure all required fields have values to satisfy TypeScript
    const playerStat: PlayerStat = { 
      ...insertPlayerStat, 
      id,
      goals: insertPlayerStat.goals || null,
      assists: insertPlayerStat.assists || null,
      yellowCards: insertPlayerStat.yellowCards || null,
      redCards: insertPlayerStat.redCards || null,
      minutesPlayed: insertPlayerStat.minutesPlayed || null,
      performance: insertPlayerStat.performance || null
    };
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
    
    // Save announcements to file
    this.saveAnnouncementsData();
    
    return announcement;
  }
  
  private saveAnnouncementsData() {
    try {
      // Convert Map to Array for JSON serialization
      const announcementsArray = Array.from(this.announcements.values());
      
      // Write to file
      fs.writeFileSync(ANNOUNCEMENTS_FILE, JSON.stringify(announcementsArray, null, 2));
      console.log(`Saved ${announcementsArray.length} announcements to storage`);
    } catch (error) {
      console.error("Error saving announcements data:", error);
    }
  }

  async updateAnnouncement(id: number, announcementData: Partial<Announcement>): Promise<Announcement | undefined> {
    const announcement = this.announcements.get(id);
    if (!announcement) return undefined;
    
    const updatedAnnouncement: Announcement = { ...announcement, ...announcementData };
    this.announcements.set(id, updatedAnnouncement);
    
    // Save announcements to file
    this.saveAnnouncementsData();
    
    return updatedAnnouncement;
  }

  async deleteAnnouncement(id: number): Promise<boolean> {
    const result = this.announcements.delete(id);
    if (result) {
      this.saveAnnouncementsData();
    }
    return result;
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
    // Ensure all required fields have values for TypeScript
    const role = insertInvitation.role || "player";
    const invitation: Invitation = { 
      ...insertInvitation, 
      id, 
      role,
      createdAt: new Date(), 
      status: "pending" 
    };
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

  // Aliases for classification methods that match our API endpoints
  async getTeamClassifications(teamId: number): Promise<LeagueClassification[]> {
    return this.getLeagueClassifications(teamId);
  }

  async findClassificationById(id: number): Promise<LeagueClassification | undefined> {
    return this.getLeagueClassification(id);
  }

  async createClassification(teamId: number, classification: Partial<InsertLeagueClassification>): Promise<LeagueClassification> {
    const fullClassification: InsertLeagueClassification = {
      teamId,
      position: classification.position || null,
      points: classification.points || 0,
      externalTeamName: classification.externalTeamName || "",
      gamesPlayed: classification.gamesPlayed || 0,
      gamesWon: classification.gamesWon || 0,
      gamesDrawn: classification.gamesDrawn || 0,
      gamesLost: classification.gamesLost || 0,
      goalsFor: classification.goalsFor || 0,
      goalsAgainst: classification.goalsAgainst || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return this.createLeagueClassification(fullClassification);
  }

  async updateClassification(id: number, classificationData: Partial<LeagueClassification>): Promise<LeagueClassification | undefined> {
    return this.updateLeagueClassification(id, classificationData);
  }

  async deleteClassification(id: number): Promise<boolean> {
    return this.deleteLeagueClassification(id);
  }

  // Season methods
  async getSeasons(teamId: number): Promise<Season[]> {
    return Array.from(this.seasons.values()).filter(season => season.teamId === teamId);
  }

  async getSeason(id: number): Promise<Season | undefined> {
    return this.seasons.get(id);
  }

  async getActiveSeasons(teamId: number): Promise<Season[]> {
    const now = new Date();
    return Array.from(this.seasons.values()).filter(season => {
      return season.teamId === teamId && 
        new Date(season.startDate) <= now &&
        (!season.endDate || new Date(season.endDate) >= now);
    });
  }

  async createSeason(seasonData: InsertSeason): Promise<Season> {
    const id = this.seasonCurrentId++;
    const createdAt = new Date();
    const updatedAt = createdAt;
    
    const season: Season = {
      id,
      ...seasonData,
      createdAt,
      updatedAt,
      isActive: true
    };
    
    this.seasons.set(id, season);
    return season;
  }

  async updateSeason(id: number, seasonData: Partial<Season>): Promise<Season | undefined> {
    const season = this.seasons.get(id);
    
    if (!season) {
      return undefined;
    }
    
    const updatedSeason: Season = {
      ...season,
      ...seasonData,
      updatedAt: new Date()
    };
    
    this.seasons.set(id, updatedSeason);
    return updatedSeason;
  }

  async deleteSeason(id: number): Promise<boolean> {
    // Check if this season is used in league classifications
    const hasReferences = Array.from(this.leagueClassifications.values())
      .some(classification => classification.seasonId === id);
    
    if (hasReferences) {
      // Can't delete a season that's referenced by classifications
      return false;
    }
    
    return this.seasons.delete(id);
  }

  async finishSeason(id: number): Promise<Season | undefined> {
    const season = this.seasons.get(id);
    
    if (!season) {
      return undefined;
    }
    
    // Set endDate to today if not already set
    const updatedSeason: Season = {
      ...season,
      endDate: season.endDate || new Date(),
      isActive: false,
      updatedAt: new Date()
    };
    
    this.seasons.set(id, updatedSeason);
    return updatedSeason;
  }

  async getLeagueClassificationsBySeason(teamId: number, seasonId: number): Promise<LeagueClassification[]> {
    return Array.from(this.leagueClassifications.values())
      .filter(classification => 
        classification.teamId === teamId && 
        classification.seasonId === seasonId
      )
      .sort((a, b) => {
        // Sort by position if available, otherwise by points
        if (a.position !== null && b.position !== null) {
          return a.position - b.position;
        } else {
          return (b.points || 0) - (a.points || 0);
        }
      });
  }
  
  // Team Lineup methods
  async getTeamLineup(teamId: number): Promise<TeamLineup | undefined> {
    return Array.from(this.teamLineups.values()).find(
      (lineup) => lineup.teamId === teamId
    );
  }

  async createTeamLineup(lineup: InsertTeamLineup): Promise<TeamLineup> {
    const id = this.teamLineupCurrentId++;
    
    const teamLineup: TeamLineup = { 
      ...lineup, 
      id,
      formation: lineup.formation,
      positionMapping: lineup.positionMapping || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.teamLineups.set(id, teamLineup);
    
    // Save team lineups to file
    this.saveTeamLineupsData();
    
    return teamLineup;
  }

  async updateTeamLineup(id: number, lineupData: Partial<TeamLineup>): Promise<TeamLineup | undefined> {
    const lineup = this.teamLineups.get(id);
    if (!lineup) return undefined;
    
    const updatedLineup: TeamLineup = { 
      ...lineup, 
      ...lineupData,
      updatedAt: new Date() 
    };
    this.teamLineups.set(id, updatedLineup);
    
    // Save team lineups to file
    this.saveTeamLineupsData();
    
    return updatedLineup;
  }
}

export const storage = new MemStorage();
