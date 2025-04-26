import { 
  pgTable, 
  text, 
  serial, 
  integer, 
  boolean, 
  timestamp, 
  date, 
  pgEnum, 
  json,
  jsonb,
  time,
  varchar,
  uuid,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { type } from "os";

// Enum definitions
export const userRoleEnum = pgEnum('user_role', ['superuser', 'admin', 'coach', 'player']);
export const matchStatusEnum = pgEnum('match_status', ['scheduled', 'completed', 'cancelled']);
export const matchTypeEnum = pgEnum('match_type', ['league', 'copa', 'friendly']);
export const eventTypeEnum = pgEnum('event_type', ['match', 'training', 'meeting', 'other']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['confirmed', 'declined', 'pending']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").notNull().default('player'),
  profilePicture: text("profile_picture"),
  position: text("position"),
  jerseyNumber: integer("jersey_number"),
  email: text("email"),
  phoneNumber: text("phone_number"),
  dateOfBirth: date("date_of_birth"),
  verificationToken: text("verification_token"),
  verificationTokenExpiry: timestamp("verification_token_expiry"),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordTokenExpiry: timestamp("reset_password_token_expiry"),
  isEmailVerified: boolean("is_email_verified").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

// Teams table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  description: text("description"),
  logo: text("logo"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  website: text("website"),
  joinCode: text("join_code").unique(),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Team members table (users in teams)
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: userRoleEnum("role").notNull().default('player'),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  isActive: boolean("is_active").default(true),
});

// Matches table
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  status: matchStatusEnum("status").notNull().default('scheduled'),
  teamId: integer("team_id").notNull().references(() => teams.id),
  opponentName: text("opponent_name").notNull(),
  opponentLogo: text("opponent_logo"),
  matchDate: timestamp("match_date").notNull(),
  location: text("location").notNull(),
  isHome: boolean("is_home").default(true),
  goalsScored: integer("goals_scored"),
  goalsConceded: integer("goals_conceded"),
  matchType: matchTypeEnum("match_type").notNull().default('friendly'),
  notes: text("notes"),
});

// Events table (for practices, meetings, etc.)
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  location: text("location"),
  eventType: eventTypeEnum("event_type").notNull().default('training'),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Attendance table (for events)
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id),
  userId: integer("user_id").notNull().references(() => users.id),
  status: attendanceStatusEnum("status").notNull().default('pending'),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Player stats table
export const playerStats = pgTable("player_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  matchId: integer("match_id").references(() => matches.id),
  teamId: integer("team_id").notNull().references(() => teams.id),
  minutesPlayed: integer("minutes_played").default(0),
  goals: integer("goals").default(0),
  assists: integer("assists").default(0),
  yellowCards: integer("yellow_cards").default(0),
  redCards: integer("red_cards").default(0),
  rating: integer("rating"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Announcements table
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Invitations table
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  email: text("email").notNull(),
  role: userRoleEnum("role").notNull().default('player'),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isAccepted: boolean("is_accepted").default(false),
  acceptedAt: timestamp("accepted_at"),
});

// Match lineup table
export const matchLineups = pgTable("match_lineups", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  matchId: integer("match_id").notNull().references(() => matches.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  playerIds: integer("player_ids").array().notNull(),
  benchPlayerIds: integer("bench_player_ids").array(),
  formation: text("formation"),
  positionMapping: json("position_mapping"),
});

// Team lineup (default)
export const teamLineups = pgTable("team_lineups", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  formation: text("formation").notNull(),
  positionMapping: json("position_mapping"),
});

// Match substitutions
export const matchSubstitutions = pgTable("match_substitutions", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  playerInId: integer("player_in_id").notNull().references(() => users.id),
  playerOutId: integer("player_out_id").notNull().references(() => users.id),
  minute: integer("minute").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Match goals
export const matchGoals = pgTable("match_goals", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  scorerId: integer("scorer_id").references(() => users.id),
  assistId: integer("assist_id").references(() => users.id),
  minute: integer("minute").notNull(),
  isOwnGoal: boolean("is_own_goal").default(false),
  isPenalty: boolean("is_penalty").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Match cards
export const matchCards = pgTable("match_cards", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  playerId: integer("player_id").notNull().references(() => users.id),
  minute: integer("minute").notNull(),
  isYellow: boolean("is_yellow").notNull(),
  isSecondYellow: boolean("is_second_yellow").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Match photos
export const matchPhotos = pgTable("match_photos", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  url: text("url").notNull(),
  caption: text("caption"),
  uploaderId: integer("uploader_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// League classifications (standings)
export const leagueClassifications = pgTable("league_classifications", {
  id: serial("id").primaryKey(),
  position: integer("position"),
  teamId: integer("team_id").notNull().references(() => teams.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  externalTeamName: text("external_team_name").notNull(),
  points: integer("points").notNull(),
  gamesPlayed: integer("games_played"),
  gamesWon: integer("games_won"),
  gamesDrawn: integer("games_drawn"),
  gamesLost: integer("games_lost"),
  goalsFor: integer("goals_for"),
  goalsAgainst: integer("goals_against"),
});

// Schema validation with Zod
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  verificationToken: true,
  verificationTokenExpiry: true,
  resetPasswordToken: true,
  resetPasswordTokenExpiry: true,
  isEmailVerified: true,
  createdAt: true,
  lastLoginAt: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true, 
  createdAt: true, 
  updatedAt: true
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true, 
  joinedAt: true
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true, 
  createdAt: true
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true, 
  createdAt: true, 
  updatedAt: true
});

export const insertPlayerStatSchema = createInsertSchema(playerStats).omit({
  id: true, 
  createdAt: true
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true, 
  createdAt: true
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true, 
  createdAt: true, 
  isAccepted: true, 
  acceptedAt: true
});

export const insertMatchLineupSchema = createInsertSchema(matchLineups).omit({
  id: true, 
  createdAt: true
});

export const insertTeamLineupSchema = createInsertSchema(teamLineups).omit({
  id: true, 
  createdAt: true, 
  updatedAt: true
});

export const insertMatchSubstitutionSchema = createInsertSchema(matchSubstitutions).omit({
  id: true, 
  createdAt: true
});

export const insertMatchGoalSchema = createInsertSchema(matchGoals).omit({
  id: true, 
  createdAt: true
});

export const insertMatchCardSchema = createInsertSchema(matchCards).omit({
  id: true, 
  createdAt: true
});

export const insertMatchPhotoSchema = createInsertSchema(matchPhotos).omit({
  id: true, 
  createdAt: true
});

export const insertLeagueClassificationSchema = createInsertSchema(leagueClassifications).omit({
  id: true, 
  createdAt: true, 
  updatedAt: true
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matches.$inferSelect;

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;

export type InsertPlayerStat = z.infer<typeof insertPlayerStatSchema>;
export type PlayerStat = typeof playerStats.$inferSelect;

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;

export type InsertMatchLineup = z.infer<typeof insertMatchLineupSchema>;
export type MatchLineup = typeof matchLineups.$inferSelect;

export type InsertTeamLineup = z.infer<typeof insertTeamLineupSchema>;
export type TeamLineup = typeof teamLineups.$inferSelect;

export type InsertMatchSubstitution = z.infer<typeof insertMatchSubstitutionSchema>;
export type MatchSubstitution = typeof matchSubstitutions.$inferSelect;

export type InsertMatchGoal = z.infer<typeof insertMatchGoalSchema>;
export type MatchGoal = typeof matchGoals.$inferSelect;

export type InsertMatchCard = z.infer<typeof insertMatchCardSchema>;
export type MatchCard = typeof matchCards.$inferSelect;

export type InsertMatchPhoto = z.infer<typeof insertMatchPhotoSchema>;
export type MatchPhoto = typeof matchPhotos.$inferSelect;

export type InsertLeagueClassification = z.infer<typeof insertLeagueClassificationSchema>;
export type LeagueClassification = typeof leagueClassifications.$inferSelect;
