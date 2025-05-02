/**
 * Health check endpoints for monitoring the application in production
 */
import { Router, Request, Response } from 'express';
import { db } from './db';
import { logger } from './logger';
import { env } from './env';

// Create a router
const router = Router();

// Basic health check endpoint - returns 200 OK if the server is running
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Define health check response type
interface HealthCheckResponse {
  status: string;
  timestamp: string;
  environment: string;
  version: string;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  services: {
    database: {
      status: string;
      responseTime?: string;
      message?: string;
    };
    email: {
      status: string;
    };
  };
}

// Detailed health check - checks database connectivity and other dependencies
router.get('/health/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const health: HealthCheckResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    services: {
      database: { status: 'checking' },
      email: { status: env.SENDGRID_API_KEY ? 'configured' : 'not_configured' }
    }
  };

  try {
    // Check database connectivity with a simple query
    const result = await db.execute('SELECT 1 AS db_check');
    health.services.database = {
      status: 'connected',
      responseTime: `${Date.now() - startTime}ms`
    };
  } catch (error) {
    health.status = 'degraded';
    health.services.database = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown database error',
      responseTime: `${Date.now() - startTime}ms`
    };
    
    logger.error({
      type: 'health_check',
      component: 'database',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }

  // Return appropriate status code based on health
  const statusCode = health.status === 'ok' ? 200 : 
                     health.status === 'degraded' ? 200 : 500;
                     
  res.status(statusCode).json(health);
});

export default router;