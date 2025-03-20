import { pgTable, text, serial, integer, boolean, timestamp, json, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role", { enum: ["admin", "coach", "player"] }).notNull().default("player"),
  profilePicture: text("profile_picture").default("/default-avatar.png"),
  position: text("position"),
  jerseyNumber: integer("jersey_number"),
  email: text("email"),
  phoneNumber: text("phone_number"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
  profilePicture: true,
  position: true,
  jerseyNumber: true,
  email: true,
  phoneNumber: true,
});

// Teams table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo: text("logo").default("/default-team-logo.png"),
  division: text("division"),
  seasonYear: text("season_year"),
  createdById: integer("created_by_id").notNull(),
});

export const insertTeamSchema = createInsertSchema(teams).pick({
  name: true,
  logo: true,
  division: true,
  seasonYear: true,
  createdById: true,
});

// TeamMembers table for player-team relationship
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  role: text("role", { enum: ["admin", "coach", "player"] }).notNull().default("player"),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).pick({
  teamId: true,
  userId: true,
  role: true,
});

// Matches table
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  opponentName: text("opponent_name").notNull(),
  opponentLogo: text("opponent_logo"),
  matchDate: timestamp("match_date").notNull(),
  location: text("location").notNull(),
  isHome: boolean("is_home").notNull(),
  goalsScored: integer("goals_scored"),
  goalsConceded: integer("goals_conceded"),
  status: text("status", { enum: ["scheduled", "completed", "cancelled"] }).notNull().default("scheduled"),
  notes: text("notes"),
});

export const insertMatchSchema = createInsertSchema(matches).pick({
  teamId: true,
  opponentName: true,
  opponentLogo: true,
  matchDate: true,
  location: true,
  isHome: true,
  goalsScored: true,
  goalsConceded: true,
  status: true,
  notes: true,
});

// Events table for trainings and other team events
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  title: text("title").notNull(),
  type: text("type", { enum: ["training", "match", "meeting", "other"] }).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  location: text("location").notNull(),
  description: text("description"),
  createdById: integer("created_by_id").notNull(),
});

export const insertEventSchema = createInsertSchema(events).pick({
  teamId: true,
  title: true,
  type: true,
  startTime: true,
  endTime: true,
  location: true,
  description: true,
  createdById: true,
});

// Attendance table for tracking who attended events
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status", { enum: ["confirmed", "declined", "pending"] }).notNull().default("pending"),
});

export const insertAttendanceSchema = createInsertSchema(attendance).pick({
  eventId: true,
  userId: true,
  status: true,
});

// PlayerStats table for tracking individual player statistics
export const playerStats = pgTable("player_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  matchId: integer("match_id").notNull(),
  goals: integer("goals").default(0),
  assists: integer("assists").default(0),
  yellowCards: integer("yellow_cards").default(0),
  redCards: integer("red_cards").default(0),
  minutesPlayed: integer("minutes_played"),
  performance: integer("performance").default(0), // Rating 1-10
});

export const insertPlayerStatSchema = createInsertSchema(playerStats).pick({
  userId: true,
  matchId: true,
  goals: true,
  assists: true,
  yellowCards: true,
  redCards: true,
  minutesPlayed: true,
  performance: true,
});

// Announcements table
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdById: integer("created_by_id").notNull(),
});

export const insertAnnouncementSchema = createInsertSchema(announcements).pick({
  teamId: true,
  title: true,
  content: true,
  createdById: true,
});

// Invitations table for team invites
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  email: text("email").notNull(),
  role: text("role", { enum: ["admin", "coach", "player"] }).notNull().default("player"),
  status: text("status", { enum: ["pending", "accepted", "declined"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdById: integer("created_by_id").notNull(),
});

export const insertInvitationSchema = createInsertSchema(invitations).pick({
  teamId: true,
  email: true,
  role: true,
  createdById: true,
});

// MatchLineups table for initial lineups
export const matchLineups = pgTable("match_lineups", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  teamId: integer("team_id").notNull(),
  playerIds: integer("player_ids").array().notNull(), // Array of player IDs in the lineup
  formation: text("formation"), // e.g., "4-4-2", "4-3-3"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMatchLineupSchema = createInsertSchema(matchLineups).pick({
  matchId: true,
  teamId: true,
  playerIds: true,
  formation: true,
});

// MatchSubstitutions table for player changes
export const matchSubstitutions = pgTable("match_substitutions", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  playerInId: integer("player_in_id").notNull(),
  playerOutId: integer("player_out_id").notNull(),
  minute: integer("minute").notNull(),
  reason: text("reason"),
});

export const insertMatchSubstitutionSchema = createInsertSchema(matchSubstitutions).pick({
  matchId: true,
  playerInId: true,
  playerOutId: true,
  minute: true,
  reason: true,
});

// MatchGoals table for detailed goal information
export const matchGoals = pgTable("match_goals", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  scorerId: integer("scorer_id").notNull(),
  assistId: integer("assist_id"), // Optional, not all goals have assists
  minute: integer("minute").notNull(),
  type: text("type", { enum: ["regular", "penalty", "free_kick", "own_goal"] }).default("regular"),
  description: text("description"),
});

export const insertMatchGoalSchema = createInsertSchema(matchGoals).pick({
  matchId: true,
  scorerId: true,
  assistId: true,
  minute: true,
  type: true,
  description: true,
});

// MatchCards table for yellow and red cards
export const matchCards = pgTable("match_cards", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  playerId: integer("player_id").notNull(),
  type: text("type", { enum: ["yellow", "red", "second_yellow"] }).notNull(),
  minute: integer("minute").notNull(),
  reason: text("reason"),
});

export const insertMatchCardSchema = createInsertSchema(matchCards).pick({
  matchId: true,
  playerId: true,
  type: true,
  minute: true,
  reason: true,
});

// MatchPhotos table for storing match photos
export const matchPhotos = pgTable("match_photos", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  url: text("url").notNull(),
  caption: text("caption"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  uploadedById: integer("uploaded_by_id").notNull(),
});

export const insertMatchPhotoSchema = createInsertSchema(matchPhotos).pick({
  matchId: true,
  url: true,
  caption: true,
  uploadedById: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export type PlayerStat = typeof playerStats.$inferSelect;
export type InsertPlayerStat = z.infer<typeof insertPlayerStatSchema>;

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

export type MatchLineup = typeof matchLineups.$inferSelect;
export type InsertMatchLineup = z.infer<typeof insertMatchLineupSchema>;

export type MatchSubstitution = typeof matchSubstitutions.$inferSelect;
export type InsertMatchSubstitution = z.infer<typeof insertMatchSubstitutionSchema>;

export type MatchGoal = typeof matchGoals.$inferSelect;
export type InsertMatchGoal = z.infer<typeof insertMatchGoalSchema>;

export type MatchCard = typeof matchCards.$inferSelect;
export type InsertMatchCard = z.infer<typeof insertMatchCardSchema>;

export type MatchPhoto = typeof matchPhotos.$inferSelect;
export type InsertMatchPhoto = z.infer<typeof insertMatchPhotoSchema>;
