/**
 * Centralized Permissions System for TeamKick
 * 
 * This file defines all permission rules for pages and API endpoints.
 * It serves as the single source of truth for access control throughout the application.
 */

import { UserRole, TeamMemberRole } from './roles';

/**
 * Type definitions for permissions system
 */
export type PagePath = 
  | '/admin-page'
  | '/dashboard-page'
  | '/team-page'
  | '/matches-page'
  | '/event-page'
  | '/statistics-page'
  | '/settings';

export type ApiEndpoint =
  | '/api/teams'
  | '/api/teams/:teamId/members'
  | '/api/teams/:teamId/matches'
  | '/api/teams/:teamId/matches/:matchId/details'
  | '/api/teams/:teamId/events'
  | '/api/teams/:teamId/events/:eventId/attendance'
  | '/api/teams/:teamId/settings'
  | '/api/teams/:teamId/claims'
  | '/api/teams/:teamId/invitations';

/**
 * Page permissions - defines which roles can access each frontend page
 */
export const pagePermissions: Record<PagePath, {
  allowedRoles: UserRole[];
  readOnly: boolean | ((role: UserRole) => boolean);
}> = {
  // Admin page - superuser only
  '/admin-page': {
    allowedRoles: [UserRole.SUPERUSER],
    readOnly: false
  },
  
  // Dashboard page - all roles can view
  '/dashboard-page': {
    allowedRoles: [
      UserRole.SUPERUSER,
      UserRole.ADMIN,
      UserRole.COACH,
      UserRole.PLAYER,
      UserRole.COLABORADOR
    ],
    readOnly: false
  },
  
  // Team page - all roles can view, but players and colaborador are in read-only mode
  '/team-page': {
    allowedRoles: [
      UserRole.SUPERUSER,
      UserRole.ADMIN,
      UserRole.COACH,
      UserRole.PLAYER,
      UserRole.COLABORADOR
    ],
    readOnly: (role: UserRole) => role === UserRole.PLAYER || role === UserRole.COLABORADOR
  },
  
  // Matches page - all roles can view, but players and colaborador are in read-only mode
  '/matches-page': {
    allowedRoles: [
      UserRole.SUPERUSER,
      UserRole.ADMIN,
      UserRole.COACH,
      UserRole.PLAYER,
      UserRole.COLABORADOR
    ],
    readOnly: (role: UserRole) => role === UserRole.PLAYER || role === UserRole.COLABORADOR
  },
  
  // Event page - all roles can view, but players and colaborador have limited editing
  '/event-page': {
    allowedRoles: [
      UserRole.SUPERUSER,
      UserRole.ADMIN,
      UserRole.COACH,
      UserRole.PLAYER,
      UserRole.COLABORADOR
    ],
    // Players and colaborador can update attendance but nothing else
    readOnly: false
  },
  
  // Statistics page - all roles can view
  '/statistics-page': {
    allowedRoles: [
      UserRole.SUPERUSER,
      UserRole.ADMIN,
      UserRole.COACH,
      UserRole.PLAYER,
      UserRole.COLABORADOR
    ],
    readOnly: false
  },
  
  // Settings page - only admin can access
  '/settings': {
    allowedRoles: [
      UserRole.SUPERUSER,
      UserRole.ADMIN,
      UserRole.COACH,
    ],
    readOnly: (role: UserRole) => role === UserRole.COACH
  }
};

/**
 * API endpoint permissions - defines which roles can access each API endpoint
 */
export const apiPermissions: Record<ApiEndpoint, {
  [key in ApiMethod]?: {
    allowedRoles: UserRole[];
  };
}> = {
  // Team endpoints
  '/api/teams': {
    GET: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH,
        UserRole.PLAYER,
        UserRole.COLABORADOR
      ]
    },
    POST: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN
      ]
    },
    PUT: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN
      ]
    },
    DELETE: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN
      ]
    }
  },
  
  // Team members endpoints
  '/api/teams/:teamId/members': {
    GET: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH,
        UserRole.PLAYER,
        UserRole.COLABORADOR
      ]
    },
    POST: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH
      ]
    },
    PUT: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH
      ]
    },
    DELETE: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH
      ]
    }
  },
  
  // Matches endpoints
  '/api/teams/:teamId/matches': {
    GET: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH,
        UserRole.PLAYER,
        UserRole.COLABORADOR
      ]
    },
    POST: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH
      ]
    },
    PUT: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH
      ]
    },
    DELETE: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH
      ]
    }
  },
  
  // Match details endpoints (lineups, substitutions, goals, cards)
  '/api/teams/:teamId/matches/:matchId/details': {
    GET: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH,
        UserRole.PLAYER,
        UserRole.COLABORADOR
      ]
    },
    POST: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH
      ]
    },
    PUT: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH
      ]
    },
    DELETE: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH
      ]
    }
  },
  
  // Events endpoints
  '/api/teams/:teamId/events': {
    GET: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH,
        UserRole.PLAYER,
        UserRole.COLABORADOR
      ]
    },
    POST: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH
      ]
    },
    PUT: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH
      ]
    },
    DELETE: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH
      ]
    }
  },
  
  // Event attendance endpoints - all roles can manage their own attendance
  '/api/teams/:teamId/events/:eventId/attendance': {
    GET: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH,
        UserRole.PLAYER,
        UserRole.COLABORADOR
      ]
    },
    POST: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH,
        UserRole.PLAYER,
        UserRole.COLABORADOR
      ]
    },
    PUT: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH,
        UserRole.PLAYER,
        UserRole.COLABORADOR
      ]
    },
    DELETE: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH
      ]
    }
  },
  
  // Team settings
  '/api/teams/:teamId/settings': {
    GET: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH
      ]
    },
    PUT: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN
      ]
    }
  },
  
  // Member claims
  '/api/teams/:teamId/claims': {
    GET: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH
      ]
    },
    POST: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH,
        UserRole.PLAYER
      ]
    },
    PUT: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH
      ]
    }
  },
  
  // Member invitations
  '/api/teams/:teamId/invitations': {
    GET: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH
      ]
    },
    POST: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH
      ]
    },
    DELETE: {
      allowedRoles: [
        UserRole.SUPERUSER,
        UserRole.ADMIN,
        UserRole.COACH
      ]
    }
  }
};

/**
 * Function types and utility functions
 */

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Check if a path is a valid PagePath
 */
function isValidPagePath(path: string): path is PagePath {
  return Object.keys(pagePermissions).includes(path as PagePath);
}

/**
 * Check if a path is a valid ApiEndpoint
 */
function isValidApiEndpoint(endpoint: string): endpoint is ApiEndpoint {
  return Object.keys(apiPermissions).includes(endpoint as ApiEndpoint);
}

/**
 * Match a request path to a permission pattern
 * 
 * @param requestPath - The actual request path (e.g., "/api/teams/123/members")
 * @returns The matching permission pattern if found (e.g., "/api/teams/:teamId/members")
 */
function matchApiPathPattern(requestPath: string): ApiEndpoint | null {
  // First check for exact match
  if (isValidApiEndpoint(requestPath)) {
    return requestPath;
  }
  
  // If no exact match, try pattern matching for endpoints with parameters
  const endpointPatterns = Object.keys(apiPermissions) as ApiEndpoint[];
  
  for (const pattern of endpointPatterns) {
    // Skip non-pattern endpoints
    if (!pattern.includes(':')) continue;
    
    // Convert :param to regex pattern
    const regexPattern = pattern.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${regexPattern}$`);
    
    if (regex.test(requestPath)) {
      return pattern;
    }
  }
  
  return null;
}

/**
 * Check if a user has permission to access a page
 * 
 * @param pagePath - The page path to check
 * @param userRole - The user's role
 * @returns True if user has access, false otherwise
 */
export function hasPagePermission(pagePath: string, userRole: UserRole): boolean {
  if (!isValidPagePath(pagePath)) return false;
  
  const permission = pagePermissions[pagePath];
  return permission.allowedRoles.includes(userRole);
}

/**
 * Check if a user should be in read-only mode for a page
 * 
 * @param pagePath - The page path to check
 * @param userRole - The user's role
 * @returns True if user should be in read-only mode, false otherwise
 */
export function isPageReadOnly(pagePath: string, userRole: UserRole): boolean {
  if (!isValidPagePath(pagePath)) return true; // Default to read-only if invalid path
  
  const permission = pagePermissions[pagePath];
  
  if (typeof permission.readOnly === 'function') {
    return permission.readOnly(userRole);
  }
  
  return permission.readOnly;
}

/**
 * Check if a user has permission to access an API endpoint with a specific method
 * 
 * @param requestPath - The actual request path
 * @param method - The HTTP method
 * @param userRole - The user's role
 * @returns True if user has access, false otherwise
 */
export function hasApiPermission(requestPath: string, method: ApiMethod, userRole: UserRole): boolean {
  const pattern = matchApiPathPattern(requestPath);
  
  if (!pattern) return false;
  
  const endpointPermission = apiPermissions[pattern];
  const methodPermission = endpointPermission[method];
  
  if (!methodPermission) return false;
  
  return methodPermission.allowedRoles.includes(userRole);
}