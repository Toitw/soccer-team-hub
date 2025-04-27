/**
 * Health check module for production deployments
 * 
 * This module provides dedicated health check endpoints that work
 * consistently in both development and production environments.
 */

import { Router } from 'express';
import { env } from './env';
import { pool } from './db';
import { logger } from './logger';

// Create a dedicated router for health check endpoints
const healthRouter = Router();

/**
 * Basic health check response that works across environments
 * and can be configured for various deployment platforms
 */
async function generateHealthResponse() {
  // Get database status
  let dbStatus: 'connected' | 'disconnected' = 'disconnected';
  try {
    const result = await pool.query('SELECT 1');
    if (result && result.rows && result.rows.length > 0) {
      dbStatus = 'connected';
    }
  } catch (error) {
    logger.error('Database health check failed', { 
      error: (error as Error).message 
    });
  }

  // Get memory usage
  const memoryUsage = process.memoryUsage();
  
  return {
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    service: 'team-management-app',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
    },
    database: {
      status: dbStatus
    }
  };
}

// Note: We're removing the root endpoint handler from the health router
// Root health checks will be handled conditionally in index.ts

// Health check endpoint using the standard /healthz convention
healthRouter.get('/healthz', async (req, res) => {
  try {
    const healthData = await generateHealthResponse();
    res.status(200).json(healthData);
  } catch (error) {
    logger.error('Error generating health check response', { 
      error: (error as Error).message 
    });
    
    res.status(200).json({
      status: 'degraded',
      service: 'team-management-app',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      message: 'Health check service is experiencing issues'
    });
  }
});

// Dedicated endpoint for the detailed API health check
healthRouter.get('/api/health', async (req, res) => {
  try {
    const healthData = await generateHealthResponse();
    res.status(200).json(healthData);
  } catch (error) {
    logger.error('Error generating health check response', { 
      error: (error as Error).message 
    });
    
    res.status(500).json({
      status: 'error',
      service: 'team-management-app',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      error: (error as Error).message
    });
  }
});

export { healthRouter };