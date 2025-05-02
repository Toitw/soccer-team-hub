/**
 * Production environment validation script
 * 
 * This script validates that all required environment variables are set
 * and properly configured for production deployment.
 */

import { env } from '../server/env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name using ESM-compatible techniques
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate environment variables
function validateEnvironment() {
  console.log('🔍 Validating production environment configuration...');
  
  // Check if we're running in production mode
  if (env.NODE_ENV !== 'production') {
    console.warn('⚠️  Warning: NODE_ENV is not set to "production"');
    console.warn('   Current value:', env.NODE_ENV);
    console.warn('   For production deployment, NODE_ENV should be "production"');
  }
  
  // Essential environment variables for production
  const requiredVars = [
    { name: 'DATABASE_URL', description: 'PostgreSQL database connection string' },
    { name: 'SESSION_SECRET', description: 'Secret for session encryption (min 32 chars)', minLength: 32 },
    { name: 'SENDGRID_API_KEY', description: 'SendGrid API key for sending emails' },
    { name: 'PORT', description: 'Port number for the server to listen on' },
  ];
  
  let missingVars = [];
  let insecureVars = [];
  
  // Check each required variable
  for (const varInfo of requiredVars) {
    if (!env[varInfo.name]) {
      missingVars.push(varInfo);
    } else if (varInfo.minLength && env[varInfo.name].length < varInfo.minLength) {
      insecureVars.push({
        ...varInfo,
        issue: `Too short (${env[varInfo.name].length} chars, minimum ${varInfo.minLength})`
      });
    }
  }
  
  // Optional but recommended for production
  const recommendedVars = [
    { name: 'FRONTEND_URL', description: 'Frontend URL for CORS configuration' },
    { name: 'EMAIL_FROM', description: 'Email address used as the sender for all emails' },
  ];
  
  let missingRecommendedVars = [];
  
  // Check each recommended variable
  for (const varInfo of recommendedVars) {
    if (!env[varInfo.name]) {
      missingRecommendedVars.push(varInfo);
    }
  }
  
  // Database URL validation (ensure it's a proper PostgreSQL URL)
  if (env.DATABASE_URL && !env.DATABASE_URL.startsWith('postgres')) {
    insecureVars.push({
      name: 'DATABASE_URL',
      description: 'PostgreSQL database connection string',
      issue: 'Invalid format (should start with "postgres://" or "postgresql://")'
    });
  }
  
  // Report validation results
  if (missingVars.length === 0 && insecureVars.length === 0 && missingRecommendedVars.length === 0) {
    console.log('✅ All required environment variables are properly configured for production.');
    return true;
  }
  
  // Report missing required variables
  if (missingVars.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    for (const varInfo of missingVars) {
      console.error(`   - ${varInfo.name}: ${varInfo.description}`);
    }
  }
  
  // Report insecure variables
  if (insecureVars.length > 0) {
    console.error('\n⚠️  Security issues with environment variables:');
    for (const varInfo of insecureVars) {
      console.error(`   - ${varInfo.name}: ${varInfo.issue}`);
    }
  }
  
  // Report missing recommended variables
  if (missingRecommendedVars.length > 0) {
    console.warn('\n⚠️  Missing recommended environment variables:');
    for (const varInfo of missingRecommendedVars) {
      console.warn(`   - ${varInfo.name}: ${varInfo.description}`);
    }
  }
  
  // Suggest how to set the variables
  console.log('\n📝 How to set environment variables:');
  console.log('   1. For local development: Add them to a .env file');
  console.log('   2. For Replit deployment: Set them in the Secrets tab in your Repl');
  console.log('   3. For other environments: Set them according to your hosting provider');
  
  return missingVars.length === 0 && insecureVars.length === 0;
}

// Run the validation
try {
  const isValid = validateEnvironment();
  process.exit(isValid ? 0 : 1);
} catch (error) {
  console.error('Error validating environment:', error);
  process.exit(1);
}