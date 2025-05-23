/**
 * Unified Database Schema for TeamKick Soccer Manager
 * 
 * This is the single source of truth for all database schema definitions.
 * It combines and harmonizes all previous schema files into one coherent structure.
 */

import { relations, sql } from "drizzle-orm";
import { pgTable, text, serial, integer, boolean, timestamp, json, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { UserRole, TeamMemberRole, MemberClaimStatus, userRoleEnum, teamMemberRoleEnum, memberClaimStatusEnum } from "./roles";

// Additional enum definitions for better type safety
export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",
  "completed",
  "cancelled",
]);

export const matchTypeEnum = pgEnum("match_type", [
  "league",
  "copa",
  "friendly"
]);

export const eventTypeEnum = pgEnum("event_type", [
  "training",
  "match",
  "meeting",
  "other"
]);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: userRoleEnum("role").notNull().default(UserRole.PLAYER),
  profilePicture: text("profile_picture").default("/default-avatar.png"),
  position: text("position"),
  jerseyNumber: integer("jersey_number"),
  email: text("email").unique(),
  phoneNumber: text("phone_number"),
  isEmailVerified: boolean("is_email_verified").default(false),
  verificationToken: text("verification_token"),
  verificationTokenExpiry: timestamp("verification_token_expiry"),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordTokenExpiry: timestamp("reset_password_token_expiry"),
  lastLoginAt: timestamp("last_login_at"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  firstName: true,
  lastName: true,
  role: true,
  profilePicture: true,
  position: true,
  jerseyNumber: true,
  email: true,
  phoneNumber: true,
  isEmailVerified: true,
  verificationToken: true,
  verificationTokenExpiry: true,
  onboardingCompleted: true,
});

// Teams table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo: text("logo").default("/default-team-logo.png"),
  division: text("division"),
  seasonYear: text("season_year"),
  category: text("category", { enum: ["PROFESSIONAL", "FEDERATED", "AMATEUR"] }),
  teamType: text("team_type", { enum: ["11-a-side", "7-a-side", "Futsal"] }),
  createdById: integer("created_by_id").notNull(),
  joinCode: text("join_code").unique(), // Unique join code for team registration
});

export const insertTeamSchema = createInsertSchema(teams).pick({
  name: true,
  logo: true,
  division: true,
  seasonYear: true,
  category: true,
  teamType: true,
  createdById: true,
  joinCode: true,
});

// TeamMembers table for player-team relationship managed by admin/coach
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  fullName: text("full_name").notNull(),
  role: teamMemberRoleEnum("role").notNull().default(TeamMemberRole.PLAYER),
  position: text("position"),
  jerseyNumber: integer("jersey_number"),
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdById: integer("created_by_id").notNull(),
  // User association fields (for verified members)
  userId: integer("user_id"), // Nullable - only set when a member is verified/claimed
  isVerified: boolean("is_verified").default(false), // Indicates if this member is verified/linked to a user
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers)
  .omit({ id: true, createdAt: true })
  .extend({
    position: z.string().optional().nullable(),
    jerseyNumber: z.number().int().optional().nullable(),
    profilePicture: z.string().optional().nullable(),
    userId: z.number().optional().nullable(),
    isVerified: z.boolean().optional().nullable(),
  });

// TeamUsers table for team access through joining with code
export const teamUsers = pgTable("team_users", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  // This table doesn't dictate the role in the team, it just establishes access
});

export const insertTeamUserSchema = createInsertSchema(teamUsers).pick({
  teamId: true,
  userId: true,
});

// Member claims table for tracking user claims to be team members
export const memberClaims = pgTable("member_claims", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  teamMemberId: integer("team_member_id").notNull(), // The member being claimed
  userId: integer("user_id").notNull(), // The user making the claim
  status: memberClaimStatusEnum("status").notNull().default(MemberClaimStatus.PENDING),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedById: integer("reviewed_by_id"), // Admin/coach who reviewed the claim
  rejectionReason: text("rejection_reason"), // Optional reason for rejection
});

export const insertMemberClaimSchema = createInsertSchema(memberClaims)
  .pick({
    teamId: true,
    teamMemberId: true,
    userId: true,
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
  status: matchStatusEnum("status").notNull().default("scheduled"),
  matchType: matchTypeEnum("match_type").notNull().default("friendly"),
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
  matchType: true,
  notes: true,
});

// Events table for trainings and other team events
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  title: text("title").notNull(),
  eventType: eventTypeEnum("event_type").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  location: text("location").notNull(),
  description: text("description"),
  createdById: integer("created_by_id").notNull(),
});

export const insertEventSchema = createInsertSchema(events).pick({
  teamId: true,
  title: true,
  eventType: true,
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
  // Using created_at instead of response_time to match database structure
  createdAt: timestamp("created_at").defaultNow(), 
  updatedAt: timestamp("updated_at").defaultNow(),
  notes: text("notes"),
});

export const insertAttendanceSchema = createInsertSchema(attendance).pick({
  eventId: true,
  userId: true,
  status: true,
  notes: true,
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
  role: teamMemberRoleEnum("role").notNull().default(TeamMemberRole.PLAYER),
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
  benchPlayerIds: integer("bench_player_ids").array(), // Array of player IDs on the bench
  formation: text("formation"), // e.g., "4-4-2", "4-3-3"
  positionMapping: jsonb("position_mapping"), // JSON mapping of position IDs to player IDs
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMatchLineupSchema = createInsertSchema(matchLineups).pick({
  matchId: true,
  teamId: true,
  playerIds: true,
  benchPlayerIds: true,
  formation: true,
  positionMapping: true,
});

// MatchSubstitutions table for player changes
export const matchSubstitutions = pgTable("match_substitutions", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  playerInId: integer("player_in_id").notNull(),
  playerOutId: integer("player_out_id").notNull(),
  minute: integer("minute").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMatchSubstitutionSchema = createInsertSchema(matchSubstitutions).pick({
  matchId: true,
  playerInId: true,
  playerOutId: true,
  minute: true,
});

// MatchGoals table for detailed goal information
export const matchGoals = pgTable("match_goals", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  scorerId: integer("scorer_id").notNull(),
  assistId: integer("assist_id"), // Optional, not all goals have assists
  minute: integer("minute").notNull(),
  isOwnGoal: boolean("is_own_goal").default(false),
  isPenalty: boolean("is_penalty").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMatchGoalSchema = createInsertSchema(matchGoals).pick({
  matchId: true,
  scorerId: true,
  assistId: true,
  minute: true,
  isOwnGoal: true,
  isPenalty: true,
});

// MatchCards table for yellow and red cards
export const matchCards = pgTable("match_cards", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  playerId: integer("player_id").notNull(),
  minute: integer("minute").notNull(),
  isYellow: boolean("is_yellow").default(true),
  isSecondYellow: boolean("is_second_yellow").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMatchCardSchema = createInsertSchema(matchCards).pick({
  matchId: true,
  playerId: true,
  minute: true,
  isYellow: true,
  isSecondYellow: true,
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

// Team Lineups table for storing default team formations
export const teamLineups = pgTable("team_lineups", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().unique(), // One lineup per team
  formation: text("formation").notNull(), // e.g., "4-4-2", "4-3-3"
  positionMapping: jsonb("position_mapping"), // JSON mapping of position IDs to player IDs
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // These fields are in the schema but not in the actual database yet
  // name: text("name"),
  // isDefault: boolean("is_default").default(false),
});

export const insertTeamLineupSchema = createInsertSchema(teamLineups).pick({
  teamId: true,
  formation: true,
  positionMapping: true,
  // name: true,
  // isDefault: true,
});

// League Classification table
export const leagueClassification = pgTable("league_classification", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(), // Reference to the team this classification belongs to
  seasonId: integer("season_id"), // Reference to the season this classification belongs to (optional for backward compatibility)
  externalTeamName: text("external_team_name").notNull(), // Name of the external team in the league
  points: integer("points").notNull().default(0),
  position: integer("position"),
  gamesPlayed: integer("games_played").default(0),
  gamesWon: integer("games_won").default(0),
  gamesDrawn: integer("games_drawn").default(0),
  gamesLost: integer("games_lost").default(0),
  goalsFor: integer("goals_for").default(0),
  goalsAgainst: integer("goals_against").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Fields from optimized schema
  season: text("season"),
  wins: integer("wins"),
  draws: integer("draws"),
  losses: integer("losses"),
});

export const insertLeagueClassificationSchema = createInsertSchema(leagueClassification).pick({
  teamId: true,
  seasonId: true,
  externalTeamName: true,
  points: true,
  position: true,
  gamesPlayed: true,
  gamesWon: true,
  gamesDrawn: true,
  gamesLost: true,
  goalsFor: true,
  goalsAgainst: true,
  season: true,
});

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
}));

export const teamsRelations = relations(teams, ({ many, one }) => ({
  creator: one(users, {
    fields: [teams.createdById],
    references: [users.id],
  }),
  members: many(teamMembers),
  matches: many(matches),
  events: many(events),
  announcements: many(announcements),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  team: one(teams, {
    fields: [announcements.teamId],
    references: [teams.id],
  }),
  creator: one(users, {
    fields: [announcements.createdById],
    references: [users.id],
  }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  team: one(teams, {
    fields: [matches.teamId],
    references: [teams.id],
  }),
  goals: many(matchGoals),
  cards: many(matchCards),
  lineups: many(matchLineups),
  substitutions: many(matchSubstitutions),
}));

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

export type TeamUser = typeof teamUsers.$inferSelect;
export type InsertTeamUser = z.infer<typeof insertTeamUserSchema>;

export type MemberClaim = typeof memberClaims.$inferSelect;
export type InsertMemberClaim = z.infer<typeof insertMemberClaimSchema>;

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

export type TeamLineup = typeof teamLineups.$inferSelect;
export type InsertTeamLineup = z.infer<typeof insertTeamLineupSchema>;

export type MatchSubstitution = typeof matchSubstitutions.$inferSelect;
export type InsertMatchSubstitution = z.infer<typeof insertMatchSubstitutionSchema>;

export type MatchGoal = typeof matchGoals.$inferSelect;
export type InsertMatchGoal = z.infer<typeof insertMatchGoalSchema>;

export type MatchCard = typeof matchCards.$inferSelect;
export type InsertMatchCard = z.infer<typeof insertMatchCardSchema>;

export type MatchPhoto = typeof matchPhotos.$inferSelect;
export type InsertMatchPhoto = z.infer<typeof insertMatchPhotoSchema>;

export type LeagueClassification = typeof leagueClassification.$inferSelect;
export type InsertLeagueClassification = z.infer<typeof insertLeagueClassificationSchema>;

export type LeagueClassification = typeof leagueClassification.$inferSelect;
export type InsertLeagueClassification = z.infer<typeof insertLeagueClassificationSchema>;

// Seasons table
export const seasons = pgTable("seasons", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSeasonSchema = createInsertSchema(seasons).pick({
  teamId: true,
  name: true,
  startDate: true,
  endDate: true,
  isActive: true,
  description: true,
});

export type Season = typeof seasons.$inferSelect;
export type InsertSeason = z.infer<typeof insertSeasonSchema>;

// Feedback table for user-submitted feedback
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"), // Optional as guests may also submit feedback
  name: text("name"), // Optional name field
  email: text("email"), // Email to reply to
  type: text("type", { enum: ["bug", "suggestion", "improvement", "other"] }).notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status", { enum: ["pending", "reviewed", "resolved"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFeedbackSchema = createInsertSchema(feedback).pick({
  userId: true,
  name: true,
  email: true,
  type: true, 
  subject: true,
  message: true,
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
