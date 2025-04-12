import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if a user is authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized: Authentication required" });
    return;
  }
  next();
}

/**
 * Middleware to check if a user has a superuser role
 */
export function requireSuperuser(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized: Authentication required" });
    return;
  }
  
  if (req.user?.role !== "superuser") {
    res.status(403).json({ error: "Forbidden: Superuser access required" });
    return;
  }
  
  next();
}

/**
 * Middleware to check if a user has admin or superuser role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized: Authentication required" });
    return;
  }
  
  if (req.user?.role !== "admin" && req.user?.role !== "superuser") {
    res.status(403).json({ error: "Forbidden: Admin access required" });
    return;
  }
  
  next();
}

/**
 * Middleware to check if a user has specific roles
 * @param roles - Array of allowed roles
 */
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized: Authentication required" });
      return;
    }
    
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: `Forbidden: One of these roles required: ${roles.join(', ')}` });
      return;
    }
    
    next();
  };
}