import { pgTable, text, serial, integer, boolean, timestamp, json, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Common schema creation helper
function createEntitySchema<T extends Record<string, any>>(table: any, fields: (keyof T)[]) {
  return createInsertSchema(table).pick(
    fields.reduce((acc, field) => ({ ...acc, [field]: true }), {})
  );
}

// Common type export helper
function exportTypes<T, S>(tableName: string, table: any, schema: any) {
  return {
    type: `export type ${tableName} = typeof ${table}.$inferSelect;`,
    insertType: `export type Insert${tableName} = z.infer<typeof ${schema}>;`
  };
}

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

export const insertUserSchema = createEntitySchema<typeof users.$inferSelect>(users, [
  "username", "password", "fullName", "role", "profilePicture", "position", "jerseyNumber", "email", "phoneNumber"
]);

// Teams table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo: text("logo").default("/default-team-logo.png"),
  division: text("division"),
  seasonYear: text("season_year"),
  createdById: integer("created_by_id").notNull(),
  joinCode: text("join_code").unique(),
});

export const insertTeamSchema = createEntitySchema<typeof teams.$inferSelect>(teams, [
  "name", "logo", "division", "seasonYear", "createdById", "joinCode"
]);

// TeamMembers table
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  role: text("role", { enum: ["admin", "coach", "player"] }).notNull().default("player"),
});

export const insertTeamMemberSchema = createEntitySchema<typeof teamMembers.$inferSelect>(teamMembers, [
  "teamId", "userId", "role"
]);

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
  matchType: text("match_type", { enum: ["league", "copa", "friendly"] }).notNull().default("friendly"),
  notes: text("notes"),
});

export const insertMatchSchema = createEntitySchema<typeof matches.$inferSelect>(matches, [
  "teamId", "opponentName", "opponentLogo", "matchDate", "location", "isHome", 
  "goalsScored", "goalsConceded", "status", "matchType", "notes"
]);

// Events table
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

export const insertEventSchema = createEntitySchema<typeof events.$inferSelect>(events, [
  "teamId", "title", "type", "startTime", "endTime", "location", "description", "createdById"
]);

// Attendance table
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status", { enum: ["confirmed", "declined", "pending"] }).notNull().default("pending"),
});

export const insertAttendanceSchema = createEntitySchema<typeof attendance.$inferSelect>(attendance, [
  "eventId", "userId", "status"
]);

// PlayerStats table
export const playerStats = pgTable("player_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  matchId: integer("match_id").notNull(),
  goals: integer("goals").default(0),
  assists: integer("assists").default(0),
  yellowCards: integer("yellow_cards").default(0),
  redCards: integer("red_cards").default(0),
  minutesPlayed: integer("minutes_played"),
  performance: integer("performance").default(0),
});

export const insertPlayerStatSchema = createEntitySchema<typeof playerStats.$inferSelect>(playerStats, [
  "userId", "matchId", "goals", "assists", "yellowCards", "redCards", "minutesPlayed", "performance"
]);

// Announcements table
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdById: integer("created_by_id").notNull(),
});

export const insertAnnouncementSchema = createEntitySchema<typeof announcements.$inferSelect>(announcements, [
  "teamId", "title", "content", "createdById"
]);

// Invitations table
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  email: text("email").notNull(),
  role: text("role", { enum: ["admin", "coach", "player"] }).notNull().default("player"),
  status: text("status", { enum: ["pending", "accepted", "declined"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdById: integer("created_by_id").notNull(),
});

export const insertInvitationSchema = createEntitySchema<typeof invitations.$inferSelect>(invitations, [
  "teamId", "email", "role", "createdById"
]);

// MatchLineups table
export const matchLineups = pgTable("match_lineups", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  teamId: integer("team_id").notNull(),
  playerIds: integer("player_ids").array().notNull(),
  benchPlayerIds: integer("bench_player_ids").array(),
  formation: text("formation"),
  positionMapping: jsonb("position_mapping"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMatchLineupSchema = createEntitySchema<typeof matchLineups.$inferSelect>(matchLineups, [
  "matchId", "teamId", "playerIds", "benchPlayerIds", "formation", "positionMapping"
]);

// MatchSubstitutions table
export const matchSubstitutions = pgTable("match_substitutions", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  playerInId: integer("player_in_id").notNull(),
  playerOutId: integer("player_out_id").notNull(),
  minute: integer("minute").notNull(),
  reason: text("reason"),
});

export const insertMatchSubstitutionSchema = createEntitySchema<typeof matchSubstitutions.$inferSelect>(matchSubstitutions, [
  "matchId", "playerInId", "playerOutId", "minute", "reason"
]);

// MatchGoals table
export const matchGoals = pgTable("match_goals", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  scorerId: integer("scorer_id").notNull(),
  assistId: integer("assist_id"),
  minute: integer("minute").notNull(),
  type: text("type", { enum: ["regular", "penalty", "free_kick", "own_goal"] }).default("regular"),
  description: text("description"),
});

export const insertMatchGoalSchema = createEntitySchema<typeof matchGoals.$inferSelect>(matchGoals, [
  "matchId", "scorerId", "assistId", "minute", "type", "description"
]);

// MatchCards table
export const matchCards = pgTable("match_cards", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  playerId: integer("player_id").notNull(),
  type: text("type", { enum: ["yellow", "red", "second_yellow"] }).notNull(),
  minute: integer("minute").notNull(),
  reason: text("reason"),
});

export const insertMatchCardSchema = createEntitySchema<typeof matchCards.$inferSelect>(matchCards, [
  "matchId", "playerId", "type", "minute", "reason"
]);

// TeamLineups table
export const teamLineups = pgTable("team_lineups", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().unique(),
  formation: text("formation").notNull(),
  positionMapping: jsonb("position_mapping"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTeamLineupSchema = createEntitySchema<typeof teamLineups.$inferSelect>(teamLineups, [
  "teamId", "formation", "positionMapping"
]);

// MatchPhotos table
export const matchPhotos = pgTable("match_photos", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  url: text("url").notNull(),
  caption: text("caption"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  uploadedById: integer("uploaded_by_id").notNull(),
});

export const insertMatchPhotoSchema = createEntitySchema<typeof matchPhotos.$inferSelect>(matchPhotos, [
  "matchId", "url", "caption", "uploadedById"
]);

// League Classification table
export const leagueClassification = pgTable("league_classification", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  externalTeamName: text("external_team_name").notNull(),
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
});

export const insertLeagueClassificationSchema = createEntitySchema<typeof leagueClassification.$inferSelect>(leagueClassification, [
  "teamId", "externalTeamName", "points", "position", "gamesPlayed", "gamesWon", 
  "gamesDrawn", "gamesLost", "goalsFor", "goalsAgainst"
]);

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