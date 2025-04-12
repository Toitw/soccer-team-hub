import { Request, Response, NextFunction } from 'express';
import { User } from '@shared/schema';

// Middleware to require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized: Please login to access this resource' });
  }
  next();
}

// Type guard to check if user has required role
function hasRole(user: User | undefined, roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

// Middleware to require specific role(s)
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User | undefined;
    
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: Please login to access this resource' });
    }
    
    if (!hasRole(user, roles)) {
      return res.status(403).json({ 
        message: 'Forbidden: You do not have permission to access this resource',
        required: roles,
        current: user.role
      });
    }
    
    next();
  };
}

// Middleware to require team membership
export function requireTeamMembership() {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User | undefined;
    const teamId = parseInt(req.params.teamId, 10) || parseInt(req.params.id, 10) || parseInt(req.body.teamId, 10);
    
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: Please login to access this resource' });
    }
    
    // Superusers bypass team membership check
    if (user.role === 'superuser') {
      return next();
    }
    
    // TODO: Check if user is a member of the team
    // This would require access to the storage layer
    // For now, we'll just assume it's implemented
    
    next();
  };
}

// Middleware to require team admin role
export function requireTeamAdmin() {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User | undefined;
    const teamId = parseInt(req.params.teamId, 10) || parseInt(req.params.id, 10) || parseInt(req.body.teamId, 10);
    
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: Please login to access this resource' });
    }
    
    // Superusers bypass team admin check
    if (user.role === 'superuser') {
      return next();
    }
    
    // TODO: Check if user is a team admin
    // This would require access to the storage layer
    // For now, we'll just assume it's implemented
    
    next();
  };
}