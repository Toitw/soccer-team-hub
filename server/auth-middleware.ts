/**
 * Authentication and Authorization Middleware
 * 
 * This file contains all middleware related to authenticating users
 * and authorizing access to routes based on the centralized permissions map.
 */

import { Request, Response, NextFunction } from 'express';
import { User } from '@shared/schema';
import { storage } from './storage-implementation';
import { UserRole, TeamMemberRole, isValidUserRole, isValidTeamMemberRole, canAdministerTeam, isTeamAdminRole } from '@shared/roles';
import { hasApiPermission, ApiMethod, PagePath, pagePermissions, apiPermissions } from '@shared/permissions';

/**
 * Extract the API endpoint pattern from a request path
 * This function normalizes request paths to match the patterns in the permissions map
 * 
 * @param req - Express request object
 * @returns Normalized API endpoint path
 */
function getApiEndpoint(req: Request): string {
  // Get the full path including baseUrl
  return req.baseUrl + req.path;
}

/**
 * Type guard to check if user has required role
 * @param user - User object
 * @param roles - Array of allowed roles
 * @returns Boolean indicating if user has one of the required roles
 */
function hasRole(user: User | undefined, roles: UserRole[]): boolean {
  if (!user || !user.role) return false;
  return roles.includes(user.role as UserRole);
}

/**
 * Middleware to check if a user is authenticated
 * Use this on routes that require authentication
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ error: 'Unauthorized. Please log in.' });
}

/**
 * Alias for isAuthenticated - for backward compatibility with existing code
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  return isAuthenticated(req, res, next);
}

/**
 * Middleware to check if a user has completed onboarding
 * Use this on routes that require completed onboarding
 */
export function hasCompletedOnboarding(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  
  const user = req.user as User;
  
  if (user.onboardingCompleted) {
    return next();
  }
  
  res.status(403).json({ 
    error: 'Onboarding required', 
    message: 'Please complete the onboarding process before accessing this resource.' 
  });
}

/**
 * Middleware to check if user is an admin
 * Use this for admin-only routes
 */
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  
  const user = req.user as User;
  
  if (user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER) {
    return next();
  }
  
  res.status(403).json({ error: 'Forbidden. Admin access required.' });
}

/**
 * Middleware to check if user is a team admin or coach
 * Use this for team management routes
 * Requires teamId parameter in the route
 */
export function isTeamAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  
  const teamId = parseInt(req.params.teamId || req.params.id || req.body.teamId);
  if (isNaN(teamId)) {
    return res.status(400).json({ error: 'Invalid team ID provided' });
  }
  
  const user = req.user as User;
  
  // If user is a global admin, always grant access
  if (canAdministerTeam(user.role as UserRole)) {
    return next();
  }
  
  // For regular users, check if they're an admin or coach for this specific team
  storage.getTeamMember(teamId, user.id)
    .then(member => {
      if (member && isTeamAdminRole(member.role as TeamMemberRole)) {
        return next();
      }
      res.status(403).json({ error: 'Not authorized to access this team' });
    })
    .catch(error => {
      console.error('Error checking team membership:', error);
      res.status(500).json({ error: 'Failed to verify team access' });
    });
}

/**
 * Alias for isTeamAdmin - for backward compatibility with existing code
 */
export function requireTeamAdmin() {
  return (req: Request, res: Response, next: NextFunction) => {
    return isTeamAdmin(req, res, next);
  };
}

/**
 * Middleware to check if user is a member of a specific team
 * Use this for team-specific routes that any member can access
 * Requires teamId parameter in the route
 */
export function isTeamMember(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  
  const teamId = parseInt(req.params.teamId || req.params.id || req.body.teamId);
  if (isNaN(teamId)) {
    return res.status(400).json({ error: 'Invalid team ID provided' });
  }
  
  const user = req.user as User;
  
  // If user is a global admin, always grant access
  if (canAdministerTeam(user.role as UserRole)) {
    return next();
  }
  
  // Check if user is a member of this team
  storage.getTeamMember(teamId, user.id)
    .then(member => {
      if (member) {
        // Add team member information to the request for use in route handlers
        (req as any).teamMember = member;
        return next();
      }
      res.status(403).json({ error: 'Not a member of this team' });
    })
    .catch(error => {
      console.error('Error checking team membership:', error);
      res.status(500).json({ error: 'Failed to verify team membership' });
    });
}

/**
 * Alias for isTeamMember - for backward compatibility with existing code
 */
export function requireTeamMembership() {
  return (req: Request, res: Response, next: NextFunction) => {
    return isTeamMember(req, res, next);
  };
}

/**
 * Middleware to check if a user has a specific role
 * @param roles - Array of allowed roles
 * @returns A middleware function
 */
export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    
    const user = req.user as User;
    
    if (!user.role || !roles.includes(user.role as UserRole)) {
      return res.status(403).json({ 
        error: 'Forbidden. Insufficient privileges.',
        required: roles,
        current: user.role
      });
    }
    
    next();
  };
}

/**
 * Middleware to check if a user has a specific role within a team
 * @param roles - Array of allowed roles
 * @returns A middleware function
 */
export function requireTeamRole(roles: TeamMemberRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    
    const teamId = parseInt(req.params.teamId || req.params.id || req.body.teamId);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID provided' });
    }
    
    const user = req.user as User;
    
    // If user is a global admin, always grant access
    if (canAdministerTeam(user.role as UserRole)) {
      return next();
    }
    
    // Check if user has the required role in this team
    storage.getTeamMember(teamId, user.id)
      .then(member => {
        if (member && member.role && isValidTeamMemberRole(member.role) && roles.includes(member.role as TeamMemberRole)) {
          // Add team member information to the request for use in route handlers
          (req as any).teamMember = member;
          return next();
        }
        res.status(403).json({ 
          error: 'Insufficient team privileges',
          required: roles,
          current: member?.role || 'none'
        });
      })
      .catch(error => {
        console.error('Error checking team membership:', error);
        res.status(500).json({ error: 'Failed to verify team access' });
      });
  };
}

/**
 * Middleware to check API endpoint permissions based on the centralized permissions map
 * 
 * This middleware integrates with the centralized permissions system to authorize
 * API requests based on user roles. It should be used after authentication is set up.
 * 
 * @returns Express middleware function
 */
export function checkApiPermission() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip auth check for non-API routes and auth-related routes
    if (!req.path.startsWith('/api') || req.path.startsWith('/api/auth') || 
        req.path === '/api/login' || req.path === '/api/logout' || 
        req.path === '/api/health' || req.path === '/api/user') {
      return next();
    }

    // Require authentication for all API routes
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const user = req.user as User;
    const endpoint = getApiEndpoint(req);
    const method = req.method as ApiMethod;

    // Use centralized permission check
    if (hasApiPermission(endpoint, method, user.role as UserRole)) {
      return next();
    }

    // If user doesn't have direct permission, check if it's a team-specific endpoint
    // and if the user has appropriate team permissions
    if (endpoint.includes('/teams/') && endpoint.includes('/')) {
      // Extract teamId from request
      const teamIdMatch = endpoint.match(/\/teams\/(\d+)/);
      if (teamIdMatch && teamIdMatch[1]) {
        const teamId = parseInt(teamIdMatch[1]);
        
        // For team endpoints, check team membership and role
        return storage.getTeamMember(teamId, user.id)
          .then(member => {
            if (member) {
              // Add team member info to request for use in route handlers
              (req as any).teamMember = member;
              
              // For now, allow access to team members for GET requests
              // This is a fallback until we transition entirely to the permissions map
              if (req.method === 'GET') {
                return next();
              }
              
              // For other methods, only allow team admins and coaches
              if (member.role === 'admin' || member.role === 'coach') {
                return next();
              }
            }
            
            res.status(403).json({ 
              error: 'Insufficient privileges',
              message: 'You do not have permission to access this resource.'
            });
          })
          .catch(error => {
            console.error('Error checking team membership:', error);
            res.status(500).json({ error: 'Failed to verify team access' });
          });
      }
    }

    // Default: unauthorized
    res.status(403).json({ 
      error: 'Insufficient privileges',
      message: 'You do not have permission to access this resource.'
    });
  };
}