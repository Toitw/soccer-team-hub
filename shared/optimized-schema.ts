import { relations, sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  text,
  boolean,
  date,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum definitions for better type safety
export const userRoleEnum = pgEnum("user_role", ["admin", "coach", "player"]);
export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",
  "completed",
  "cancelled",
]);
export const matchTypeEnum = pgEnum("match_type", ["league", "friendly"]);
export const eventTypeEnum = pgEnum("event_type", [
  "match",
  "training",
  "meeting",
  "other",
]);
export const teamMemberRoleEnum = pgEnum("team_member_role", [
  "admin",
  "coach",
  "player",
]);

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").notNull().default("player"),
  profilePicture: text("profile_picture").default("/default-avatar.png"),
  position: text("position"),
  jerseyNumber: integer("jersey_number"),
  email: text("email"),
  phoneNumber: text("phone_number"),
});

// Team schema
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo: text("logo").default("/default-team-logo.png"),
  division: text("division"),
  seasonYear: text("season_year"),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  joinCode: text("join_code").unique(),
});

// Team member schema
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  role: teamMemberRoleEnum("role").notNull().default("player"),
});

// Match schema
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
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

// Event schema
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  title: text("title").notNull(),
  type: eventTypeEnum("type").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  location: text("location").notNull(),
  description: text("description"),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
});

// Attendance schema
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull(), // attending, not_attending, maybe
  responseTime: timestamp("response_time").defaultNow().notNull(),
  notes: text("notes"),
});

// Player statistics schema
export const playerStats = pgTable("player_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  season: text("season").notNull(),
  gamesPlayed: integer("games_played").notNull().default(0),
  goalsScored: integer("goals_scored").notNull().default(0),
  assists: integer("assists").notNull().default(0),
  yellowCards: integer("yellow_cards").notNull().default(0),
  redCards: integer("red_cards").notNull().default(0),
  minutesPlayed: integer("minutes_played").notNull().default(0),
});

// Announcement schema
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
});

// Match lineup schema
export const matchLineups = pgTable("match_lineups", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  formation: text("formation").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Team lineup schema
export const teamLineups = pgTable("team_lineups", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  name: text("name").notNull(),
  formation: text("formation").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Match substitution schema
export const matchSubstitutions = pgTable("match_substitutions", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id),
  playerInId: integer("player_in_id")
    .notNull()
    .references(() => users.id),
  playerOutId: integer("player_out_id")
    .notNull()
    .references(() => users.id),
  minute: integer("minute").notNull(),
  period: text("period").notNull(), // first_half, second_half, extra_time
});

// Match goal schema
export const matchGoals = pgTable("match_goals", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id),
  scorerId: integer("scorer_id")
    .notNull()
    .references(() => users.id),
  assistId: integer("assist_id").references(() => users.id),
  minute: integer("minute").notNull(),
  period: text("period").notNull(), // first_half, second_half, extra_time
  isOwnGoal: boolean("is_own_goal").notNull().default(false),
  isPenalty: boolean("is_penalty").notNull().default(false),
});

// Match card schema
export const matchCards = pgTable("match_cards", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id),
  playerId: integer("player_id")
    .notNull()
    .references(() => users.id),
  cardType: text("card_type").notNull(), // yellow, red
  minute: integer("minute").notNull(),
  period: text("period").notNull(), // first_half, second_half, extra_time
  reason: text("reason"),
});

// League classification schema
export const leagueClassification = pgTable("league_classification", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  season: text("season").notNull(),
  position: integer("position"),
  gamesPlayed: integer("games_played").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  draws: integer("draws").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  goalsFor: integer("goals_for").notNull().default(0),
  goalsAgainst: integer("goals_against").notNull().default(0),
  points: integer("points").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

// Define insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});
export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
});
export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  joinedAt: true,
});
export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
});
export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
});
export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  responseTime: true,
});
export const insertPlayerStatSchema = createInsertSchema(playerStats).omit({
  id: true,
});
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
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
});
export const insertMatchGoalSchema = createInsertSchema(matchGoals).omit({
  id: true,
});
export const insertMatchCardSchema = createInsertSchema(matchCards).omit({
  id: true,
});
export const insertLeagueClassificationSchema = createInsertSchema(leagueClassification).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Define types for use in the app
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
export type LeagueClassification = typeof leagueClassification.$inferSelect;
export type InsertLeagueClassification = z.infer<typeof insertLeagueClassificationSchema>;