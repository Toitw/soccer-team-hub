/**
 * Error diagnosis module for production troubleshooting
 * 
 * This module provides tools to capture and diagnose errors in the production environment
 * to help resolve 5XX errors.
 */

import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import { env } from './env';

// Directory for error logs
const ERROR_LOGS_DIR = './logs';
const ERROR_LOG_FILE = path.join(ERROR_LOGS_DIR, 'production-errors.log');

// Ensure the logs directory exists
if (!fs.existsSync(ERROR_LOGS_DIR)) {
  fs.mkdirSync(ERROR_LOGS_DIR, { recursive: true });
}

/**
 * Records a detailed error to the log file for later analysis
 * @param message Error message or context
 * @param error The error object
 * @param additionalInfo Any additional diagnostic information
 */
export function recordError(message: string, error: Error, additionalInfo?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  
  const errorDetails = {
    timestamp,
    message,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    environment: env.NODE_ENV,
    additionalInfo
  };
  
  // Log to the logger system
  logger.error(`Production error recorded: ${message}`, errorDetails);
  
  // In production, also write to a dedicated error log file for persistence
  if (env.NODE_ENV === 'production') {
    try {
      const formattedError = JSON.stringify(errorDetails, null, 2);
      fs.appendFileSync(ERROR_LOG_FILE, formattedError + '\n\n');
    } catch (writeError) {
      logger.error('Failed to write to error log file', { 
        error: (writeError as Error).message 
      });
    }
  }
}

/**
 * Sets up global unhandled error and promise rejection catchers
 * to ensure we don't miss any errors in production
 */
export function setupGlobalErrorHandlers() {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    recordError('Uncaught exception', error, { 
      processMemoryUsage: process.memoryUsage() 
    });
    
    // In production, we'll try to keep the server running despite the error
    if (env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    
    recordError('Unhandled promise rejection', error, {
      promise: String(promise),
      processMemoryUsage: process.memoryUsage()
    });
    
    // In production, we'll try to keep the server running despite the error
    if (env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });
  
  logger.info(`Global error handlers configured for ${env.NODE_ENV} environment`);
}

/**
 * Checks if there are any production errors recorded and returns them
 * for diagnostic purposes
 */
export function checkForRecordedErrors(): string[] {
  if (!fs.existsSync(ERROR_LOG_FILE)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(ERROR_LOG_FILE, 'utf8');
    const errors = content.split('\n\n').filter(Boolean);
    return errors;
  } catch (error) {
    logger.error('Failed to read error log file', { 
      error: (error as Error).message 
    });
    return [];
  }
}

/**
 * Clears the recorded errors log file
 */
export function clearRecordedErrors(): boolean {
  if (!fs.existsSync(ERROR_LOG_FILE)) {
    return true;
  }
  
  try {
    fs.writeFileSync(ERROR_LOG_FILE, '');
    return true;
  } catch (error) {
    logger.error('Failed to clear error log file', { 
      error: (error as Error).message 
    });
    return false;
  }
}

// Special diagnostic endpoint to add to Express for monitoring
export function addDiagnosticEndpoints(app: any) {
  // Only add in production
  if (env.NODE_ENV !== 'production') {
    return;
  }
  
  // Add a diagnostic endpoint that returns recorded errors
  app.get('/api/diagnostic', (req: any, res: any) => {
    const errors = checkForRecordedErrors();
    
    res.json({
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      errorCount: errors.length,
      errors: errors.slice(-10) // Return the most recent 10 errors
    });
  });
  
  logger.info('Diagnostic endpoints configured for production environment');
}