import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if a user is authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized: Authentication required" });
  }
  next();
}

/**
 * Middleware to check if a user has a superuser role
 */
export function requireSuperuser(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized: Authentication required" });
  }
  
  if (req.user.role !== "superuser") {
    return res.status(403).json({ error: "Forbidden: Superuser access required" });
  }
  
  next();
}

/**
 * Middleware to check if a user has admin or superuser role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized: Authentication required" });
  }
  
  if (req.user.role !== "admin" && req.user.role !== "superuser") {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  
  next();
}

/**
 * Middleware to check if a user has specific roles
 * @param roles - Array of allowed roles
 */
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized: Authentication required" });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: One of these roles required: ${roles.join(', ')}` });
    }
    
    next();
  };
}