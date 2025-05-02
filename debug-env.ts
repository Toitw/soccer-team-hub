/**
 * Environment debugging utility
 * This script helps diagnose issues with environment variables in different environments
 */

// Import the dotenv module first to ensure we load any .env file
import dotenv from 'dotenv';
dotenv.config();

// Import necessary modules
import { promises as fsPromises } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Print the current environment state
console.log('=== Environment Debug Utility ===');
console.log('Node Version:', process.version);
console.log('Node Environment:', process.env.NODE_ENV || 'not set');
console.log('\nChecking critical environment variables:');

// List of environment variables to check
const criticalVars = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'SENDGRID_API_KEY',
  'EMAIL_FROM',
  'PORT',
  'FRONTEND_URL'
];

// Check each variable
criticalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Mask sensitive values for security
    let displayValue;
    if (varName.includes('SECRET') || varName.includes('KEY') || varName.includes('URL')) {
      // Show first few characters and then mask the rest
      displayValue = value.substring(0, 5) + '...[masked]';
    } else {
      displayValue = value;
    }
    console.log(`✓ ${varName} is set to: ${displayValue}`);
  } else {
    console.log(`✗ ${varName} is not set`);
  }
});

// Try to import config.ts
console.log('\nTesting environment loading:');
try {
  // First try the config file which is the initial env loader
  import('./server/config.ts').then((configModule) => {
    console.log('✓ Successfully imported server/config.ts');
    console.log('✓ NODE_ENV from config:', configModule.NODE_ENV);
    console.log('✓ PORT from config:', configModule.PORT);
    
    // Next try importing env.ts which validates and processes env vars
    import('./server/env.ts').then(envModule => {
      console.log('✓ Successfully imported server/env.ts');
      if (envModule.env) {
        console.log('✓ env object is exported from server/env.ts');
        
        // Check for expected properties on the env object
        const properties = Object.keys(envModule.env);
        console.log(`✓ env object has ${properties.length} properties:`, properties.join(', '));
        
        // Check specific critical properties
        if (envModule.env.DATABASE_URL) {
          console.log('✓ env.DATABASE_URL is available');
        } else {
          console.log('✗ env.DATABASE_URL is undefined');
        }
        
        if (envModule.env.SESSION_SECRET) {
          console.log('✓ env.SESSION_SECRET is available');
        } else {
          console.log('✗ env.SESSION_SECRET is undefined');
        }
      } else {
        console.log('✗ env object is not exported from server/env.ts');
      }
    }).catch(err => {
      console.log('✗ Error importing server/env.ts:', err.message);
    });
  }).catch(err => {
    console.log('✗ Error importing server/config.ts:', err.message);
  });
} catch (err) {
  console.log('✗ Import error:', err.message);
}

// Check if DATABASE_URL appears to be valid
if (process.env.DATABASE_URL) {
  if (process.env.DATABASE_URL.includes('postgres')) {
    console.log('✓ DATABASE_URL format appears valid');
  } else {
    console.log('⚠ DATABASE_URL format might be incorrect');
  }
}

// Check the actual env.ts file content
async function checkEnvFile() {
  try {
    const envTsPath = path.join(__dirname, 'server', 'env.ts');
    const envTsContent = await fsPromises.readFile(envTsPath, 'utf8');
    console.log('\nChecking env.ts file:');
    console.log('✓ server/env.ts file exists and is readable');
    
    // Check for key patterns in the file
    if (envTsContent.includes('validateServerEnv()')) {
      console.log('✓ env.ts contains validateServerEnv() call');
    } else {
      console.log('✗ env.ts does not contain validateServerEnv() call');
    }
    
    if (envTsContent.includes('serverEnv = {')) {
      console.log('✓ env.ts contains fallback defaults');
    } else {
      console.log('✗ env.ts does not contain fallback defaults');
    }
    
    if (envTsContent.includes('process.exit(1)')) {
      console.log('✓ env.ts contains process.exit for production mode');
    } else {
      console.log('✗ env.ts does not contain process.exit for production mode');
    }
    
    // Check if EMAIL_FROM is properly handled
    if (envTsContent.includes('EMAIL_FROM') && envTsContent.includes('default')) {
      console.log('✓ env.ts contains EMAIL_FROM with default value');
    } else {
      console.log('✗ env.ts may not properly handle missing EMAIL_FROM');
    }
  } catch (err) {
    console.log('✗ Error reading env.ts file:', err.message);
  }
  
  // Also check for .env file existence
  try {
    const dotenvPath = path.join(__dirname, '.env');
    await fsPromises.access(dotenvPath);
    console.log('✓ .env file exists');
  } catch (err) {
    console.log('✗ .env file is missing or not accessible');
  }
}

// Additional checks for production mode
if (process.env.NODE_ENV === 'production') {
  console.log('\nProduction-specific checks:');
  
  // Check SESSION_SECRET strength in production
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    console.log('⚠ SESSION_SECRET is less than 32 characters long (recommended minimum)');
  }
  
  // Check for presence of FRONTEND_URL in production
  if (!process.env.FRONTEND_URL) {
    console.log('⚠ FRONTEND_URL is not set, which may cause CORS issues in production');
  }
}

// Run the async checks
checkEnvFile().finally(() => {
  console.log('\n=== End of Environment Debug ===');
});