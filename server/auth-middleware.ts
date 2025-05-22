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
  
  // For debugging purpose, log who is accessing which team
  console.log(`Getting teams for user ID: ${user.id}`);
  
  // Check if user is a member of this team
  storage.getTeamMember(teamId, user.id)
    .then(member => {
      if (member) {
        // Add team member information to the request for use in route handlers
        (req as any).teamMember = member;
        console.log(`User ${user.id} is a member of team ${teamId} with role ${member.role}`);
        return next();
      }
      
      // Check if user is the owner of this team
      return storage.getTeam(teamId)
        .then(team => {
          if (team && team.createdById === user.id) {
            // If the user is the team owner (creator), create a virtual admin member
            const virtualMember = {
              id: -1,
              teamId,
              userId: user.id,
              fullName: user.fullName || '',
              role: 'admin' as TeamMemberRole,
              profilePicture: user.profilePicture,
              position: user.position,
              jerseyNumber: user.jerseyNumber,
              isVerified: true,
              createdAt: new Date(),
              createdById: user.id
            };
            // Add virtual member to the request
            (req as any).teamMember = virtualMember;
            console.log(`User ${user.id} is the owner of team ${teamId}`);
            return next();
          }
          
          // Finally check team_users association
          return storage.getTeamUsersByUserId(user.id)
            .then(teamUsers => {
              console.log(`Found ${teamUsers.length} team associations for user ${user.id}`);
              
              // Check if the user is associated with this team through team_users
              const teamUserAssociation = teamUsers.find(tu => tu.teamId === teamId);
              
              if (teamUserAssociation) {
                console.log(`User ${user.id} is associated with team ${teamId} through team_users`);
                
                // Create a virtual member based on user's role
                const virtualMember = {
                  id: -1,
                  teamId,
                  userId: user.id,
                  fullName: user.fullName || '',
                  role: (user.role === 'admin' || user.role === 'coach') 
                    ? user.role as TeamMemberRole 
                    : 'player' as TeamMemberRole,
                  profilePicture: user.profilePicture,
                  position: user.position,
                  jerseyNumber: user.jerseyNumber,
                  isVerified: true,
                  createdAt: teamUserAssociation.joinedAt,
                  createdById: user.id
                };
                
                // Add virtual member to the request
                (req as any).teamMember = virtualMember;
                return next();
              }
              
              // If we've checked all possible ways and no association found
              res.status(403).json({ error: 'Not a member of this team' });
            });
        });
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
    // Skip auth check for these public endpoints
    const publicPaths = [
      '/api/health', 
      '/api/user', 
      '/api/login', 
      '/api/logout',
      '/api/auth'
    ];
    
    // Special case for feedback - allow authenticated users to submit feedback
    if (req.path === '/api/feedback' && req.method === 'POST') {
      console.log('Feedback endpoint detected, checking auth...');
      if (!req.isAuthenticated()) {
        console.log('User not authenticated for feedback');
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
      }
      console.log('User authenticated for feedback, allowing access');
      return next(); // Allow any authenticated user to submit feedback
    }
    
    // Skip for non-API routes or public endpoints
    if (!req.path.startsWith('/api') || 
        publicPaths.some(path => req.path === path || req.path.startsWith(path + '/'))) {
      return next();
    }

    // Require authentication for all API routes
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const user = req.user as User;
    
    // Special case for the teams endpoint - everyone can access this
    if (req.path === '/api/teams' && req.method === 'GET') {
      return next();
    }

    // If it's a team-specific endpoint, check team membership
    if (req.path.includes('/teams/')) {
      // Extract teamId from request
      const teamIdMatch = req.path.match(/\/teams\/(\d+)/);
      
      if (teamIdMatch && teamIdMatch[1]) {
        const teamId = parseInt(teamIdMatch[1]);
        
        // For team endpoints, check team membership and role
        return storage.getTeamMember(teamId, user.id)
          .then(member => {
            if (!member) {
              return res.status(403).json({ 
                error: 'Not a member of this team',
                message: 'You do not have permission to access this resource.'
              });
            }
            
            // Add team member info to request for use in route handlers
            (req as any).teamMember = member;
            
            // For GET requests, allow any team member access
            if (req.method === 'GET') {
              return next();
            }
            
            // For "claims" endpoints - allow player role to POST
            if (req.path.includes('/claims') && req.method === 'POST') {
              return next();
            }
            
            // For "attendance" endpoints - allow all roles to update their own attendance
            if (req.path.includes('/attendance') && (req.method === 'POST' || req.method === 'PUT')) {
              return next();
            }
            
            // For all other requests, require admin or coach role
            if (member.role === 'admin' || member.role === 'coach') {
              return next();
            }
            
            res.status(403).json({ 
              error: 'Insufficient privileges',
              message: 'You do not have permission to modify this resource.'
            });
          })
          .catch(error => {
            console.error('Error checking team membership:', error);
            res.status(500).json({ error: 'Failed to verify team access' });
          });
      }
    }

    // Use centralized permissions system for non-team endpoints
    const method = req.method as ApiMethod;
    console.log(`Checking permissions for: ${req.path} ${method} with role: ${user.role}`);
    const hasPermission = hasApiPermission(req.path, method, user.role as UserRole);
    console.log(`Permission result: ${hasPermission}`);
    
    if (hasPermission) {
      console.log(`Permission granted for ${req.path}`);
      return next();
    }

    // Check if user is admin or superuser - they can access everything
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER) {
      return next();
    }

    // Default: unauthorized
    res.status(403).json({ 
      error: 'Insufficient privileges',
      message: 'You do not have permission to access this resource.'
    });
  };
}