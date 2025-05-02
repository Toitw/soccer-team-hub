/**
 * Special handler for Replit deployment's root health check
 * 
 * This file provides a middleware that specifically handles the root path (/)
 * health checks that Replit's deployment service sends. It's crucial for
 * successful deployments as Replit expects a 200 response from the root path.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import path from 'path';
import fs from 'fs';

// File paths for health check pages
const HEALTH_CHECK_HTML_PATH = path.resolve('./public/replit-health-check.html');
const FALLBACK_HEALTH_CHECK_HTML_PATH = path.resolve('./public/health-check.html');

/**
 * Read the health check HTML file from the filesystem
 * This is more efficient than generating it on every request
 */
function getHealthCheckHtml(): string {
  try {
    // Try the optimized health check file first
    if (fs.existsSync(HEALTH_CHECK_HTML_PATH)) {
      return fs.readFileSync(HEALTH_CHECK_HTML_PATH, 'utf8');
    }
    
    // Fall back to the basic health check file
    if (fs.existsSync(FALLBACK_HEALTH_CHECK_HTML_PATH)) {
      return fs.readFileSync(FALLBACK_HEALTH_CHECK_HTML_PATH, 'utf8');
    }
  } catch (err) {
    logger.error({
      type: 'health_check_error',
      error: err instanceof Error ? err.message : String(err)
    });
  }
  
  // If all else fails, return a minimal health check page
  return `<!DOCTYPE html>
<html>
<head>
  <title>Health Check</title>
</head>
<body>
  <h1>Status: OK</h1>
  <p>TeamKick API is running</p>
  <p>Timestamp: ${new Date().toISOString()}</p>
</body>
</html>`;
}

// Pre-load the health check HTML when this module is loaded
const HEALTH_CHECK_HTML = getHealthCheckHtml();

/**
 * Middleware to handle the root path (/) specifically for Replit health checks
 * This middleware should be registered before any other routes or middleware
 * to ensure it catches the health check requests before anything else.
 */
export function replitRootHandler(req: Request, res: Response, next: NextFunction) {
  // Only intercept requests to the root path (/)
  if (req.path === '/') {
    const userAgent = req.headers['user-agent'] || '';
    
    // In production mode, we need to handle health checks specially
    if (process.env.NODE_ENV === 'production') {
      // If it looks like a Replit health check (empty user agent or contains "health")
      const isHealthCheck = !userAgent || 
                           userAgent.toLowerCase().includes('health') ||
                           userAgent.includes('curl') ||
                           req.headers['x-health-check'] === 'true' ||
                           req.query.health === 'check';
      
      if (isHealthCheck) {
        // Log the health check attempt but don't include all headers to avoid clutter
        logger.info({
          type: 'replit_health_check',
          userAgent: userAgent || 'unknown',
          path: req.path
        });
        
        // Health checks need a fast, reliable 200 response
        // Use JSON for API requests, HTML for browser requests
        if (req.headers.accept?.includes('application/json') || userAgent.includes('curl')) {
          return res.status(200).json({
            status: 'ok',
            message: 'TeamKick API is running',
            timestamp: new Date().toISOString()
          });
        } else {
          // Send the pre-loaded health check HTML for maximum performance
          return res.status(200)
            .header('Content-Type', 'text/html; charset=utf-8')
            .send(HEALTH_CHECK_HTML);
        }
      }
    }
    
    // Special case for curl requests in any mode (for testing)
    if (userAgent.includes('curl')) {
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