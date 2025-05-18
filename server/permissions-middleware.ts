/**
 * Permissions-based authorization middleware
 * 
 * This middleware uses the centralized permissions map to authorize
 * API requests based on the user's role.
 */

import { Request, Response, NextFunction } from 'express';
import { User } from '@shared/schema';
import { UserRole } from '@shared/roles';
import { hasApiPermission, ApiMethod } from '@shared/permissions';
import { storage } from './storage-implementation';

/**
 * Extract the API endpoint pattern from a request path
 * This function normalizes request paths to match the patterns in the permissions map
 * 
 * @param req - Express request object
 * @returns Normalized API endpoint path
 */
function getApiEndpoint(req: Request): string {
  // Get the base path (everything after /api)
  const fullPath = req.baseUrl + req.path;
  return fullPath;
}

/**
 * Middleware to check API endpoint permissions based on the centralized permissions map
 * 
 * @returns Express middleware function
 */
export function checkApiPermission() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip auth check for non-API routes and auth-related routes
    if (!req.path.startsWith('/api') || req.path.startsWith('/api/auth') || 
        req.path === '/api/login' || req.path === '/api/logout') {
      return next();
    }

    // Require authentication for all API routes
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const user = req.user as User;
    const endpoint = getApiEndpoint(req);
    const method = req.method as ApiMethod;

    // Check if user has permission to access this endpoint with this method
    if (hasApiPermission(endpoint, method, user.role as UserRole)) {
      return next();
    }

    // If user doesn't have permission, check if it's a team-specific endpoint
    // and the user has the required role within that team
    if (endpoint.includes('/teams/') && endpoint.includes('/')) {
      // Extract teamId from request
      const teamIdMatch = endpoint.match(/\/teams\/(\d+)/);
      if (teamIdMatch && teamIdMatch[1]) {
        const teamId = parseInt(teamIdMatch[1]);
        
        // Check if user is a member of this team with appropriate permissions
        return storage.getTeamMember(teamId, user.id)
          .then(member => {
            if (member) {
              // For now, we'll allow team members to access team-specific endpoints
              // Add team member info to request for use in route handlers
              (req as any).teamMember = member;
              return next();
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

/**
 * Middleware to check if user has appropriate permissions for a specific team resource
 * Uses the team member role for authorization
 * 
 * @param allowedRoles - Array of team member roles that are allowed to access the resource
 * @returns Express middleware function
 */
export function requireTeamRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    
    const teamId = parseInt(req.params.teamId || req.params.id || req.body.teamId);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID provided' });
    }
    
    const user = req.user as User;
    
    // Global admins and superusers always have access to all team resources
    if (user.role === UserRole.SUPERUSER || user.role === UserRole.ADMIN) {
      return next();
    }
    
    // Check if user has required role in this team
    storage.getTeamMember(teamId, user.id)
      .then(member => {
        if (member && member.role && allowedRoles.includes(member.role)) {
          // Add team member information to the request for use in route handlers
          (req as any).teamMember = member;
          return next();
        }
        
        res.status(403).json({ 
          error: 'Insufficient team privileges',
          required: allowedRoles,
          current: member?.role || 'none'
        });
      })
      .catch(error => {
        console.error('Error checking team membership:', error);
        res.status(500).json({ error: 'Failed to verify team access' });
      });
  };
}