
/**
 * Specialized health check interceptor for Replit deployments
 * 
 * This module creates a TCP server that intercepts requests before they reach Express
 * and responds directly to root path health check requests from Replit.
 */

import http from 'http';
import { logger } from './logger';
import express, { type Express } from 'express';
import path from 'path';
import fs from 'fs';

/**
 * Sets up a specialized HTTP server that handles health checks for Replit deployments
 * The health check server intercepts root path requests and returns 200 responses
 * All other requests are proxied to the Express app
 */
export function setupReplitHealthServer(app: Express): http.Server {
  const healthServer = http.createServer((req, res) => {
    // Handle only root path requests as health checks
    if (req.url === '/' || req.url === '/health-check') {
      logger.info({
        type: 'health_check',
        path: req.url,
        method: req.method,
        status: 200,
        headers: {
          'user-agent': req.headers['user-agent']
        }
      });
      
      // Check if client prefers HTML (browser)
      const acceptHeader = req.headers.accept || '';
      if (acceptHeader.includes('text/html')) {
        try {
          // Send static HTML for health check
          const healthCheckHtml = path.resolve('./public/health-check.html');
          
          if (fs.existsSync(healthCheckHtml)) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            const htmlContent = fs.readFileSync(healthCheckHtml);
            res.end(htmlContent);
          } else {
            // Fallback HTML
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>TeamKick - Health Check</title>
                  <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .status { color: #4CAF50; font-size: 24px; margin: 20px 0; }
                    .info { color: #666; font-size: 14px; }
                  </style>
                </head>
                <body>
                  <h1>TeamKick Soccer Platform</h1>
                  <div class="status">✅ System is healthy</div>
                  <p class="info">Server is running normally</p>
                </body>
              </html>
            `);
          }
        } catch (error) {
          // Even if there's an error reading the file, return 200 for health check
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Health check OK');
        }
      } else {
        // API/JSON response for programmatic health checks
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'healthy',
          service: 'TeamKick',
          timestamp: new Date().toISOString()
        }));
      }
      return;
    }
    
    // For all other paths, proxy to the Express app
    app(req, res);
  });
  
  return healthServer;
}
