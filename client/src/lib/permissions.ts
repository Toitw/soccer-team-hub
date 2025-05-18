/**
 * Client-side permissions utilities
 * 
 * This file provides client-side access to the centralized permissions map
 * defined in shared/permissions.ts.
 */

import { UserRole, TeamMemberRole } from '@shared/roles';
import { PagePath, pagePermissions } from '@shared/permissions';

/**
 * Check if a user has permission to access a page
 * 
 * @param pagePath - The page path to check
 * @param userRole - The user's role
 * @returns True if user has access, false otherwise
 */
export function hasPagePermission(pagePath: string, userRole: string): boolean {
  // Map string page paths to our PagePath type
  const path = getMatchingPagePath(pagePath);
  if (!path) return false;
  
  // Validate that the role is a valid UserRole
  const role = userRole as UserRole;
  const permission = pagePermissions[path];
  
  return permission.allowedRoles.includes(role);
}

/**
 * Check if a user should be in read-only mode for a page
 * 
 * @param pagePath - The page path to check
 * @param userRole - The user's role
 * @returns True if user should be in read-only mode, false otherwise
 */
export function isPageReadOnly(pagePath: string, userRole: string): boolean {
  // Map string page paths to our PagePath type
  const path = getMatchingPagePath(pagePath);
  if (!path) return true; // Default to read-only if no matching path
  
  // Validate that the role is a valid UserRole
  const role = userRole as UserRole;
  const permission = pagePermissions[path];
  
  if (typeof permission.readOnly === 'function') {
    return permission.readOnly(role);
  }
  
  return permission.readOnly;
}

/**
 * Get the matching path from the permissions map
 * Handles both exact matches and pattern matching
 * 
 * @param path - The path to match
 * @returns The matching path from the permissions map, or null if no match
 */
function getMatchingPagePath(path: string): PagePath | null {
  // Get all defined page paths
  const definedPaths = Object.keys(pagePermissions) as PagePath[];
  
  // First check for exact match
  if (definedPaths.includes(path as PagePath)) {
    return path as PagePath;
  }
  
  // Check for best match by path similarity
  // For example, '/team' should match '/team-page'
  for (const definedPath of definedPaths) {
    // Extract the base path without the '-page' suffix
    const basePath = definedPath.replace('-page', '');
    
    if (path === basePath || path.startsWith(basePath + '/')) {
      return definedPath;
    }
  }
  
  return null;
}