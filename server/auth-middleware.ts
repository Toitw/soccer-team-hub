/**
 * Authentication middleware for Express
 */
import { Request, Response, NextFunction } from "express";

/**
 * Middleware to check if a user is authenticated
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  return res.status(401).json({ 
    error: "Authentication required", 
    message: "You must be logged in to access this resource"
  });
}

/**
 * Middleware to check if a user has a specific role
 * @param roles - Array of allowed roles
 */
export function hasRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        error: "Authentication required", 
        message: "You must be logged in to access this resource"
      });
    }
    
    const user = req.user as { role: string };
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "You don't have permission to access this resource"
      });
    }
    
    return next();
  };
}