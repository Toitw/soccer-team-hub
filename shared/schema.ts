import { pgTable, text, serial, integer, boolean, timestamp, varchar, date, json, uniqueIndex, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").default("user"),
  avatarUrl: text("avatar_url"),
  emailVerified: boolean("email_verified").default(false),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team model
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  division: text("division"),
  category: text("category"),
  seasonYear: text("season_year"),
  logo: text("logo"),
  description: text("description"),
  joinCode: text("join_code").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team member model (connecting users to teams)
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").default("player"),
  position: text("position"),
  jerseyNumber: integer("jersey_number"),
  joinedAt: timestamp("joined_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Match model for recording game details
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  opponent: text("opponent"),
  date: timestamp("date"),
  location: text("location"),
  goalsScored: integer("goals_scored"),
  goalsConceded: integer("goals_conceded"),
  status: text("status").default("scheduled"), // scheduled, inProgress, completed, cancelled
  isHome: boolean("is_home"),
  type: text("type").default("league"), // friendly, league, cup, etc.
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event model for trainings, meetings, etc.
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type"), // training, match, meeting, etc.
  location: text("location"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Attendance model for tracking event attendance
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status").default("pending"), // pending, attending, notAttending, maybe
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Player statistics model
export const playerStats = pgTable("player_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  matchId: integer("match_id").notNull().references(() => matches.id),
  minutesPlayed: integer("minutes_played").default(0),
  goalsScored: integer("goals_scored").default(0),
  assists: integer("assists").default(0),
  yellowCards: integer("yellow_cards").default(0),
  redCards: integer("red_cards").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Announcement model
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: integer("author_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invitation model
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  role: text("role").default("player"),
  status: text("status").default("pending"), // pending, accepted, declined, expired
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Match lineup model
export const matchLineups = pgTable("match_lineups", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  formation: text("formation"),
  lineup: json("lineup").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team lineup model for default lineups
export const teamLineups = pgTable("team_lineups", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  formation: text("formation"),
  lineup: json("lineup").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Match substitutions
export const matchSubstitutions = pgTable("match_substitutions", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  playerOutId: integer("player_out_id").notNull().references(() => users.id),
  playerInId: integer("player_in_id").notNull().references(() => users.id),
  minute: integer("minute").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Match goals
export const matchGoals = pgTable("match_goals", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  scorerId: integer("scorer_id").notNull().references(() => users.id),
  assistId: integer("assist_id").references(() => users.id),
  minute: integer("minute").notNull(),
  isOwnGoal: boolean("is_own_goal").default(false),
  isPenalty: boolean("is_penalty").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Match cards
export const matchCards = pgTable("match_cards", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  playerId: integer("player_id").notNull().references(() => users.id),
  type: text("type").notNull(), // yellow, red
  minute: integer("minute").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Match photos
export const matchPhotos = pgTable("match_photos", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  url: text("url").notNull(),
  caption: text("caption"),
  uploadedById: integer("uploaded_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// League classification table
export const leagueClassifications = pgTable("league_classifications", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  seasonYear: text("season_year"),
  teamName: text("team_name").notNull(),
  position: integer("position"),
  played: integer("played").default(0),
  won: integer("won").default(0),
  drawn: integer("drawn").default(0),
  lost: integer("lost").default(0),
  goalsFor: integer("goals_for").default(0),
  goalsAgainst: integer("goals_against").default(0),
  points: integer("points").default(0),
  form: text("form"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create insert schemas for each model
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  joinedAt: true,
  updatedAt: true,
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlayerStatSchema = createInsertSchema(playerStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMatchLineupSchema = createInsertSchema(matchLineups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamLineupSchema = createInsertSchema(teamLineups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMatchSubstitutionSchema = createInsertSchema(matchSubstitutions).omit({
  id: true,
  createdAt: true,
});

export const insertMatchGoalSchema = createInsertSchema(matchGoals).omit({
  id: true,
  createdAt: true,
});

export const insertMatchCardSchema = createInsertSchema(matchCards).omit({
  id: true,
  createdAt: true,
});

export const insertMatchPhotoSchema = createInsertSchema(matchPhotos).omit({
  id: true,
  createdAt: true,
});

export const insertLeagueClassificationSchema = createInsertSchema(leagueClassifications).omit({
  id: true,
  updatedAt: true,
});

// Define types from schemas
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
