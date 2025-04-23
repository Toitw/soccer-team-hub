import dotenv from 'dotenv';
import { validateServerEnv, type ServerEnv } from '@shared/env-schema';
import { logger } from './logger';

// Load .env file if it exists
dotenv.config();

let serverEnv: ServerEnv;

try {
  // Validate environment variables against our schema
  serverEnv = validateServerEnv();
  
  // Log successful environment load
  logger.info('Environment variables loaded and validated successfully');
  
} catch (error) {
  // Log the error with detailed information
  if (error instanceof Error) {
    logger.error(`Environment validation error: ${error.message}`);
    
    // Provide more helpful error message to stdout for easier debugging
    console.error('\n==== ENVIRONMENT CONFIGURATION ERROR ====');
    console.error(error.message);
    console.error('Please check your .env file and ensure all required variables are set correctly.');
    console.error('See .env.example for a template of required variables.');
    console.error('==========================================\n');
  }
  
  // Exit the process with an error code if in production
  // In development, we'll proceed with defaults where possible
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
  
  // Apply defaults for development environment
  serverEnv = {
    DATABASE_URL: process.env.DATABASE_URL || '',
    SESSION_SECRET: process.env.SESSION_SECRET || 'teamkick-soccer-platform-dev-secret-minimum-32-characters',
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
    EMAIL_FROM: 'canchaplusapp@gmail.com',
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    PORT: 5000,
    FRONTEND_URL: process.env.FRONTEND_URL || '',
  };
  
  // Still require DATABASE_URL even in development
  if (!serverEnv.DATABASE_URL) {
    throw new Error('DATABASE_URL is required even in development environment');
  }
}

// Export the validated environment
export const env = serverEnv;