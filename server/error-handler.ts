/**
 * Enhanced error handling for production environments
 * 
 * This module provides robust error handling for the application:
 * 1. 404 Not Found handler
 * 2. Production-friendly error handler
 * 3. Structured error logging
 */

import { Request, Response, NextFunction } from 'express';
import { env } from './env';
import { logger } from './logger';

// Custom error interface
export interface AppError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

/**
 * 404 Not Found handler for API routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  // Only handle API routes to prevent interfering with frontend routes
  if (req.path.startsWith('/api')) {
    logger.warn({
      type: 'route_not_found',
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      headers: {
        'user-agent': req.headers['user-agent'],
        'host': req.headers['host'],
        'referer': req.headers['referer']
      }
    });
    
    return res.status(404).json({
      error: 'Not Found',
      message: `The requested endpoint ${req.method} ${req.path} does not exist`,
      status: 404
    });
  }
  
  // Pass through for non-API routes (will be handled by the frontend)
  next();
}

/**
 * Global error handler
 */
export function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction) {
  // Set default status code
  const statusCode = err.status || 500;
  
  // Log the error with structured data
  const errorData = {
    type: 'server_error',
    error: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    code: err.code,
    details: err.details,
    statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    headers: {
      'user-agent': req.headers['user-agent'],
      'host': req.headers['host'],
      'referer': req.headers['referer']
    }
  };
  
  // Log error with appropriate level based on status code
  if (statusCode >= 500) {
    logger.error(errorData);
  } else {
    logger.warn(errorData);
  }
  
  // Error response for API routes
  if (req.path.startsWith('/api')) {
    // Production API error response (sanitized)
    if (env.NODE_ENV === 'production') {
      return res.status(statusCode).json({
        error: statusCode >= 500 ? 'Internal Server Error' : err.message,
        status: statusCode,
        // Only include error code if it exists and we're not masking a 500 error
        ...(err.code && statusCode < 500 ? { code: err.code } : {})
      });
    }
    
    // Development API error response (detailed)
    return res.status(statusCode).json({
      error: err.message,
      stack: err.stack,
      code: err.code,
      details: err.details,
      status: statusCode
    });
  }
  
  // For non-API routes in production, pass to the frontend to handle
  if (env.NODE_ENV === 'production') {
    // In production, let the client side handle the error display
    return next();
  }
  
  // Development mode error page for non-API routes
  res.status(statusCode);
  res.send(`
    <html>
      <head>
        <title>Error: ${statusCode}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 2rem; }
          h1 { color: #d32f2f; }
          pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow: auto; }
        </style>
      </head>
      <body>
        <h1>Error: ${statusCode}</h1>
        <p>${err.message}</p>
        ${err.code ? `<p>Code: ${err.code}</p>` : ''}
        <h2>Stack Trace:</h2>
        <pre>${err.stack}</pre>
      </body>
    </html>
  `);
}

/**
 * Utility function for logging errors
 */
export function logError(message: string, details: any = {}) {
  logger.error({
    type: 'application_error',
    message,
    ...details
  });
}