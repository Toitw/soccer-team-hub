/**
 * Base configuration - loads environment variables
 * This file is the base for all configuration and does not import anything else
 * to avoid circular dependencies
 */
import dotenv from 'dotenv';

// Load .env file if it exists
dotenv.config();

// Export the current NODE_ENV
export const NODE_ENV = (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development';

// Default port for the server
// In Cloud Run, this will use the dynamically assigned port
export const PORT = parseInt(process.env.PORT || '5000', 10);

// Is production environment?
export const IS_PRODUCTION = NODE_ENV === 'production';

// Simple way to determine if we're in development or test mode
export const IS_DEV = NODE_ENV === 'development';
export const IS_TEST = NODE_ENV === 'test';