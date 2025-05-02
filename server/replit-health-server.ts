/**
 * Standalone health check server for Replit deployments
 * 
 * This server runs on the same port as the main application but only intercepts
 * the root path (/) requests, answering with a simple 200 OK response.
 * 
 * The express middleware chain will handle all other routes.
 */

import http from 'http';
import { Express } from 'express';
import { logger } from './logger';

/**
 * Setup a health check server interceptor specifically for Replit deployments
 * @param app The Express application to wrap
 * @returns A server instance that handles health checks
 */
export function setupReplitHealthServer(app: Express): http.Server {
  // Create an HTTP server that will intercept requests before Express
  const server = http.createServer((req, res) => {
    // Only intercept requests to the root path (/)
    if (req.url === '/') {
      // Log this health check request
      logger.info({
        type: 'replit_root_health_check',
        method: req.method,
        path: req.url,
        userAgent: req.headers['user-agent'] || 'unknown'
      });
      
      // Return a simple 200 OK response
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'X-Health-Check': 'replit-deployment'
      });
      
      // Write a JSON response with current timestamp
      res.end(JSON.stringify({
        status: 'ok',
        message: 'TeamKick API is running',
        timestamp: new Date().toISOString()
      }));
      
      return;
    }
    
    // For all other requests, let the Express app handle them
    app(req, res);
  });
  
  return server;
}