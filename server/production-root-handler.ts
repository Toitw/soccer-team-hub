/**
 * Production Root Path Handler for Replit Deployments
 * 
 * This file provides a standalone route handler for the root path (/)
 * specifically designed for production deployments on Replit.
 * 
 * IMPORTANT: This module completely replaces Vite's catch-all handler
 * when running in production mode. It needs to be the very last middleware
 * registered when in production.
 */

import express, { Router, Request, Response } from 'express';
import { logger } from './logger';

const router = Router();

// Handle the root path for health checks
router.get('/', (req: Request, res: Response) => {
  // Log the health check request with limited data
  logger.info({
    type: 'replit_deployment_health_check',
    userAgent: req.headers['user-agent'] || 'unknown',
    accept: req.headers.accept
  });
  
  // Determine response format based on Accept header
  const wantsJson = req.headers.accept?.includes('application/json');
  
  if (wantsJson) {
    // Return JSON for API clients
    return res.status(200).json({
      status: 'ok',
      message: 'TeamKick API is running',
      timestamp: new Date().toISOString()
    });
  } else {
    // Return a simple HTML page for browsers
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>TeamKick API Status</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #f5f5f5;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            text-align: center;
          }
          h1 { color: #228B22; }
          p { margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>✅ TeamKick API is running</h1>
        <p>Status: OK</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      </body>
      </html>
    `);
  }
});

export default router;