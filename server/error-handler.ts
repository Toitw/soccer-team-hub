/**
 * Advanced error handling middleware for Express
 * Provides structured error responses and logging for production
 */
import { Request, Response, NextFunction } from 'express';
import { logger, logError } from './logger';
import { env } from './env';

// Custom error class for API errors
export class APIError extends Error {
  status: number;
  code: string;
  
  constructor(message: string, status = 500, code = 'INTERNAL_SERVER_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    
    // Capture stack trace (V8 specific)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Database validation error
export class ValidationError extends APIError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
  details: any;
}

// Not found error
export class NotFoundError extends APIError {
  constructor(resource = 'Resource', id?: string | number) {
    const message = id 
      ? `${resource} with ID ${id} not found` 
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
  }
}

// Forbidden error
export class ForbiddenError extends APIError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

// Unauthorized error
export class UnauthorizedError extends APIError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

// Conflict error
export class ConflictError extends APIError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Error normalizer - converts various error types to standardized API errors
 */
export function normalizeError(err: any): APIError {
  // Already an API error
  if (err instanceof APIError) {
    return err;
  }

  // Database errors
  if (err.code && typeof err.code === 'string') {
    // PostgreSQL error codes
    if (err.code.startsWith('23')) {
      // Data integrity issues
      if (err.code === '23505') { // Unique violation
        return new ConflictError(err.detail || 'Duplicate entry detected');
      } else if (err.code === '23503') { // Foreign key violation
        return new ValidationError(err.detail || 'Referenced resource does not exist');
      } else if (err.code === '23502') { // Not null violation
        return new ValidationError(`Required field missing: ${err.column || 'unknown'}`);
      }
      // Other integrity constraints
      return new ValidationError('Data integrity constraint violation');
    }
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return new ValidationError('Validation failed', err.errors);
  }

  // JWT/Auth errors
  if (err.name === 'JsonWebTokenError') {
    return new UnauthorizedError('Invalid token');
  }
  if (err.name === 'TokenExpiredError') {
    return new UnauthorizedError('Token expired');
  }

  // Default to internal server error for unhandled cases
  const apiError = new APIError(
    err.message || 'Internal Server Error',
    err.status || err.statusCode || 500
  );
  
  // Preserve stack trace
  apiError.stack = err.stack;
  return apiError;
}

/**
 * Main error handling middleware
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  // Normalize the error to APIError format
  const normalizedError = normalizeError(err);
  
  // Prepare the response
  const errorResponse = {
    error: {
      message: normalizedError.message,
      code: normalizedError.code,
      status: normalizedError.status,
    }
  };
  
  // In development, add stack trace and details
  if (env.NODE_ENV !== 'production') {
    (errorResponse.error as any).stack = normalizedError.stack;
    if ((normalizedError as ValidationError).details) {
      (errorResponse.error as any).details = (normalizedError as ValidationError).details;
    }
  }
  
  // Log the error with structured context for monitoring
  const logLevel = normalizedError.status >= 500 ? 'error' : 'warn';
  const logData = {
    type: 'api_error',
    path: req.path,
    method: req.method,
    statusCode: normalizedError.status,
    errorCode: normalizedError.code,
    errorMessage: normalizedError.message,
    ...(env.NODE_ENV !== 'production' && { stack: normalizedError.stack }),
    userId: (req as any).user?.id,
    requestId: (req as any).id
  };

  if (logLevel === 'error') {
    logError('API Error', logData);
  } else {
    logger.warn(logData);
  }

  // Send the error response
  res.status(normalizedError.status).json(errorResponse);
}

/**
 * 404 handler middleware - for routes that don't exist
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  // Skip for non-API routes (let client-side routing handle it)
  if (!req.path.startsWith('/api')) {
    return next();
  }
  
  // For API routes, return a 404
  const err = new NotFoundError('Endpoint');
  next(err);
}