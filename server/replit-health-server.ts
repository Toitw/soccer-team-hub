/**
 * Replit Deployment Health Check
 * 
 * This file contains a special handler for Replit Deployments health checks
 * that intercepts requests to root (/) path before Express processes them.
 * This is necessary because in production, all routes (including /) are
 * handled by the static file server or the SPA router.
 */

import { createServer } from 'http';
import { Express } from 'express';
import { logger } from './logger';

export function setupReplitHealthServer(app: Express) {
  // Create a specialized server that intercepts root path requests
  // before they reach Express, and returns a 200 status code for health checks
  const server = createServer((req, res) => {
    const url = req.url || '';
    const method = req.method || '';

    // Only intercept GET requests to the root path or health check paths
    if (method === 'GET' && (url === '/' || url === '/health-check' || url === '/health')) {
      logger.info({
        type: 'health_check',
        path: url,
        userAgent: req.headers['user-agent'] || 'unknown',
        source: 'health_server_interceptor'
      });

      // Return 200 OK with JSON response for health checks
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.end(JSON.stringify({
        status: 'ok',
        message: 'Health check passed',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown'
      }));
      return;
    }

    // For all other requests, pass to Express
    app(req, res);
  });

  return server;
}