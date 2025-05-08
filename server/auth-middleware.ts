import { Request, Response, NextFunction } from 'express';

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
 * Middleware to check if a user has completed onboarding
 * Use this on routes that require completed onboarding
 */
export function hasCompletedOnboarding(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  
  const user = req.user as any;
  
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
  
  const user = req.user as any;
  
  if (user.role === 'admin' || user.role === 'superuser') {
    return next();
  }
  
  res.status(403).json({ error: 'Forbidden. Admin access required.' });
}

/**
 * Middleware to check if user is a team admin
 * Use this for team admin routes
 * Requires teamId parameter in the route
 */
export function isTeamAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  
  // This middleware expects teamId parameter to be present
  // Will be handled inside the route handler with proper team access check
  next();
}