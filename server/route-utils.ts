import { Request, Response, NextFunction, Router } from 'express';
import { isAuthenticated, requireRole as authRequireRole } from './auth-middleware';

/**
 * Type for route handler functions
 */
export type RouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;

/**
 * Wraps an async route handler with error handling
 * @param handler - The route handler function
 * @returns A route handler with error handling
 */
export function asyncHandler(handler: RouteHandler): RouteHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Interface for route configuration
 */
export interface RouteConfig {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  handler: RouteHandler;
  middleware?: RouteHandler[];
}

/**
 * Function to register routes on a router
 * @param router - The Express router
 * @param routes - Array of route configurations
 */
export function registerRoutes(router: Router, routes: RouteConfig[]): void {
  for (const route of routes) {
    const { path, method, handler, middleware = [] } = route;
    router[method](path, ...middleware, asyncHandler(handler));
  }
}

/**
 * Auth middleware to check if a user is authenticated (using centralized version)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  isAuthenticated(req, res, next);
}

/**
 * Auth middleware to check if a user has a specific role (using centralized version)
 * @param roles - Array of allowed roles
 * @returns A middleware function
 */
export function requireRole(roles: string[]): RouteHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const userRole = req.user?.role;
    if (!userRole || !roles.includes(userRole)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    next();
  };
}

/**
 * Create a standard JSON response
 * For admin endpoints, ensure we always return an array for consistent frontend handling
 * @param res - Express response object
 * @param data - Data to send
 * @param status - HTTP status code
 */
export function jsonResponse(res: Response, data: any, status = 200): void {
  // Set content type header explicitly to ensure proper JSON response
  res.setHeader('Content-Type', 'application/json');
  
  // For admin endpoints, ensure users and teams are returned as arrays
  const url = res.req.originalUrl;
  if (url.includes('/api/admin/users') && !url.includes('/api/admin/users/')) {
    // Ensure users endpoint returns array
    const resultData = Array.isArray(data) ? data : data ? [data] : [];
    res.status(status).json(resultData);
  } else if (url.includes('/api/admin/teams') && !url.includes('/api/admin/teams/')) {
    // Ensure teams endpoint returns array
    const resultData = Array.isArray(data) ? data : data ? [data] : [];
    res.status(status).json(resultData);
  } else {
    // Standard response for other endpoints
    res.status(status).json(data);
  }
}

/**
 * Create a standard error response
 * @param res - Express response object
 * @param message - Error message
 * @param status - HTTP status code
 */
export function errorResponse(res: Response, message: string, status = 500): void {
  // Set content type header explicitly to ensure proper JSON response
  res.setHeader('Content-Type', 'application/json');
  res.status(status).json({ error: message });
}

/**
 * Create a standard success response
 * @param res - Express response object
 * @param message - Success message
 */
export function successResponse(res: Response, message: string): void {
  // Set content type header explicitly to ensure proper JSON response
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ success: true, message });
}

/**
 * Create a standard created response
 * @param res - Express response object
 * @param data - Created entity data
 */
export function createdResponse(res: Response, data: any): void {
  // Set content type header explicitly to ensure proper JSON response
  res.setHeader('Content-Type', 'application/json');
  res.status(201).json(data);
}

/**
 * Handle a not found response
 * @param res - Express response object
 * @param entity - Name of the entity that was not found
 */
export function notFoundResponse(res: Response, entity: string): void {
  // Set content type header explicitly to ensure proper JSON response
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({ error: `${entity} not found` });
}