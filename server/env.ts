import { validateServerEnv, type ServerEnv } from '@shared/env-schema';
import { NODE_ENV } from './config';

// .env is already loaded by config.ts

let serverEnv: ServerEnv;

try {
  // Validate environment variables against our schema
  serverEnv = validateServerEnv();
  
  // Log successful environment load
  console.log('Environment variables loaded and validated successfully');
  
} catch (error) {
  // Log the error with detailed information
  if (error instanceof Error) {
    // Provide more helpful error message to stdout for easier debugging
    console.error('\n==== ENVIRONMENT CONFIGURATION ERROR ====');
    console.error(error.message);
    console.error('Please check your .env file and ensure all required variables are set correctly.');
    console.error('See .env.example for a template of required variables.');
    console.error('==========================================\n');
  }
  
  // Apply sensible defaults, even in production to prevent crashes
  // For security variables, we'll log warnings but still continue in production
  // rather than crashing the application
  console.warn('Applying fallback values for missing environment variables');
  
  const hasDbUrl = Boolean(process.env.DATABASE_URL);
  const hasSessionSecret = Boolean(process.env.SESSION_SECRET);
  const hasSendgridKey = Boolean(process.env.SENDGRID_API_KEY);
  
  serverEnv = {
    DATABASE_URL: process.env.DATABASE_URL || '',
    SESSION_SECRET: process.env.SESSION_SECRET || 'teamkick-soccer-platform-dev-secret-minimum-32-characters',
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
    EMAIL_FROM: process.env.EMAIL_FROM || 'canchaplusapp@gmail.com',
    NODE_ENV: NODE_ENV,
    PORT: parseInt(process.env.PORT || '5000', 10),
    FRONTEND_URL: process.env.FRONTEND_URL || '',
  };
  
  // Critical security warnings for production mode
  if (NODE_ENV === 'production') {
    if (!hasDbUrl) {
      console.error('WARNING: DATABASE_URL is missing. Using empty string as fallback.');
      console.error('This will likely cause database connection failures.');
    }
    if (!hasSessionSecret) {
      console.error('WARNING: SESSION_SECRET is missing. Using default value.');
      console.error('This is a major security risk. Set a proper SESSION_SECRET in production.');
    }
    if (!hasSendgridKey) {
      console.warn('WARNING: SENDGRID_API_KEY is missing. Email functionality will not work properly.');
    }
  }
  
  // Still require DATABASE_URL even in development
  if (!serverEnv.DATABASE_URL) {
    throw new Error('DATABASE_URL is required even in development environment');
  }
}

// Make sure FRONTEND_URL is set for production CORS settings
if (!serverEnv.FRONTEND_URL && NODE_ENV === 'production') {
  // Fallback to a safe default for CORS in production
  console.warn('FRONTEND_URL not set, using "https://teamkick.replit.app" as fallback for CORS');
  serverEnv.FRONTEND_URL = 'https://teamkick.replit.app';
}

// Export the validated environment
export const env = serverEnv;