/**
 * Centralized role definitions for the TeamKick platform
 * This file serves as the single source of truth for all role-related enums
 * and utility functions throughout the application.
 */

import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Global user roles that apply to the entire application
 */
export enum UserRole {
  SUPERUSER = "superuser", // Has access to everything
  ADMIN = "admin",         // Global administrator
  COACH = "coach",         // Coach with specific privileges
  PLAYER = "player",       // Standard player
  COLABORADOR = "colaborador" // Contributor/helper role
}

/**
 * Team member roles that apply within the context of a team
 */
export enum TeamMemberRole {
  ADMIN = "admin",         // Team administrator
  COACH = "coach",         // Team coach
  PLAYER = "player",       // Team player
  COLABORADOR = "colaborador" // Team contributor/helper
}

/**
 * Member claim status for the process of claiming to be a team member
 */
export enum MemberClaimStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected"
}

/**
 * PostgreSQL enum definitions for use in Drizzle schema
 */
export const userRoleEnum = pgEnum("user_role", [
  "superuser",
  "admin", 
  "coach", 
  "player", 
  "colaborador"
]);

export const teamMemberRoleEnum = pgEnum("team_member_role", [
  "admin", 
  "coach", 
  "player", 
  "colaborador"
]);

export const memberClaimStatusEnum = pgEnum("member_claim_status", [
  "pending",
  "approved",
  "rejected"
]);

/**
 * Type guard to check if a value is a valid UserRole
 */
export function isValidUserRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

/**
 * Type guard to check if a value is a valid TeamMemberRole
 */
export function isValidTeamMemberRole(role: string): role is TeamMemberRole {
  return Object.values(TeamMemberRole).includes(role as TeamMemberRole);
}

/**
 * Type guard to check if a value is a valid MemberClaimStatus
 */
export function isValidMemberClaimStatus(status: string): status is MemberClaimStatus {
  return Object.values(MemberClaimStatus).includes(status as MemberClaimStatus);
}

/**
 * Check if a user role has team administration capabilities
 */
export function canAdministerTeam(userRole: UserRole): boolean {
  return [UserRole.SUPERUSER, UserRole.ADMIN].includes(userRole);
}

/**
 * Check if a team member role has team administration capabilities
 */
export function isTeamAdminRole(role: TeamMemberRole): boolean {
  return [TeamMemberRole.ADMIN, TeamMemberRole.COACH].includes(role);
}

/**
 * Maps a user role to an appropriate team member role
 * Used when creating a new team
 */
export function mapUserRoleToTeamRole(userRole: UserRole): TeamMemberRole {
  switch(userRole) {
    case UserRole.SUPERUSER:
    case UserRole.ADMIN:
      return TeamMemberRole.ADMIN;
    case UserRole.COACH:
      return TeamMemberRole.COACH;
    case UserRole.COLABORADOR:
      return TeamMemberRole.COLABORADOR;
    case UserRole.PLAYER:
    default:
      return TeamMemberRole.PLAYER;
  }
}