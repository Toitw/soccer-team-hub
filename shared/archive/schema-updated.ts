/**
 * Updated Schema with new Members-Users Model
 */
import { pgTable, text, serial, integer, boolean, timestamp, json, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role", { enum: ["superuser", "admin", "coach", "player", "colaborador"] }).notNull().default("player"),
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

// TeamMembers table - now represents actual team members created by admin/coach
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role", { enum: ["admin", "coach", "player", "colaborador"] }).notNull().default("player"),
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
  .omit({ id: true, createdAt: true, userId: true, isVerified: true })
  .extend({
    position: z.string().optional().nullable(),
    jerseyNumber: z.number().int().optional().nullable(),
    profilePicture: z.string().optional().nullable(),
  });

// TeamUsers table for team access/visualization (users who joined with code)
export const teamUsers = pgTable("team_users", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
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
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
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
  status: text("status", { enum: ["scheduled", "completed", "cancelled"] }).notNull().default("scheduled"),
  matchType: text("match_type", { enum: ["league", "copa", "friendly"] }).notNull().default("friendly"),
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

// Other tables remain unchanged...

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

// Include all other type definitions and exports from the original schema.ts