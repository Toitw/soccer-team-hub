/**
 * Special handler for Replit deployment's root health check
 * 
 * This file provides a middleware that specifically handles the root path (/)
 * health checks that Replit's deployment service sends. It's crucial for
 * successful deployments as Replit expects a 200 response from the root path.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

/**
 * Middleware to handle the root path (/) specifically for Replit health checks
 * This middleware should be registered before any other routes or middleware
 * to ensure it catches the health check requests before anything else.
 */
export function replitRootHandler(req: Request, res: Response, next: NextFunction) {
  // Only intercept requests to the root path (/)
  if (req.path === '/') {
    // Check if this is a health check request from Replit deployment service
    // We can detect this by checking user-agent, but here we'll use a more inclusive approach
    const isHealthCheck = process.env.NODE_ENV === 'production';
    
    if (isHealthCheck) {
      logger.info({
        type: 'replit_health_check',
        userAgent: req.headers['user-agent'],
        path: req.path
      });
      
      // Return a simple 200 OK response for Replit health checks
      return res.status(200).json({
        status: 'ok',
        message: 'TeamKick API is running',
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // For all other requests, continue to the next middleware
  next();
}