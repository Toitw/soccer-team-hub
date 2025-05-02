/**
 * Health check endpoints for the TeamKick application
 * 
 * These endpoints provide system monitoring capabilities:
 * 1. Basic health check at /api/health
 * 2. Detailed health check at /api/health/detailed
 */

import express from 'express';
import { pool } from './db';
import { version } from '../package.json';
import { env } from './env';
import os from 'os';
import { logger } from './logger';

const router = express.Router();

// Basic health check endpoint
router.get('/health', async (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Detailed health check endpoint for system monitoring
router.get('/health/detailed', async (req, res) => {
  let databaseStatus = 'unknown';
  let databaseResponseTime = 0;
  let databaseError = null;
  
  // Check database connection
  const dbCheckStart = Date.now();
  try {
    const result = await pool.query('SELECT 1 AS db_check');
    databaseStatus = result.rows[0].db_check === 1 ? 'connected' : 'error';
    databaseResponseTime = Date.now() - dbCheckStart;
  } catch (error: any) {
    databaseStatus = 'error';
    databaseResponseTime = Date.now() - dbCheckStart;
    databaseError = error.message;
    logger.error({
      type: 'health_check_error',
      component: 'database',
      error: error.message
    });
  }
  
  // System information
  const systemInfo = {
    platform: process.platform,
    nodeVersion: process.version,
    uptime: Math.floor(process.uptime()),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    loadAverage: os.loadavg(),
    cpuCount: os.cpus().length
  };
  
  // Generate health status report
  const healthStatus = {
    status: databaseStatus === 'connected' ? 'healthy' : 'degraded',
    version,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    upSince: new Date(Date.now() - (process.uptime() * 1000)).toISOString(),
    database: {
      status: databaseStatus,
      responseTime: `${databaseResponseTime}ms`,
      error: databaseError
    },
    system: systemInfo
  };
  
  // Log detailed health check for monitoring
  logger.info({
    type: 'health_check',
    status: healthStatus.status,
    databaseStatus: databaseStatus,
    databaseResponseTime: databaseResponseTime
  });
  
  res.status(databaseStatus === 'connected' ? 200 : 500).json(healthStatus);
});

export default router;