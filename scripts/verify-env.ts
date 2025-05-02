/**
 * A quick environment verification script
 * Used to verify the environment configuration without running the full deployment process
 */

import { env } from '../server/env';

console.log('==== Environment Verification ====');
console.log('NODE_ENV:', env.NODE_ENV);

// Critical variables
const criticalVars = ['DATABASE_URL', 'SESSION_SECRET'];
console.log('\nCritical Variables:');
criticalVars.forEach(varName => {
  const value = env[varName as keyof typeof env];
  // Mask sensitive values
  const displayValue = varName.includes('SECRET') || varName.includes('URL') 
    ? (value ? value.toString().substring(0, 5) + '...[masked]' : 'not set')
    : value;
  
  console.log(`- ${varName}: ${displayValue ? '✅ set' : '❌ not set'}`);
});

// Recommended variables
const recommendedVars = ['SENDGRID_API_KEY', 'EMAIL_FROM', 'FRONTEND_URL'];
console.log('\nRecommended Variables:');
recommendedVars.forEach(varName => {
  const value = env[varName as keyof typeof env];
  // Mask sensitive values
  const displayValue = varName.includes('KEY') 
    ? (value ? value.toString().substring(0, 5) + '...[masked]' : 'not set')
    : value;
  
  console.log(`- ${varName}: ${value ? '✅ set' : '⚠️ using fallback'}`);
});

// Check if the environment looks valid for production
if (env.NODE_ENV === 'production' && env.DATABASE_URL) {
  console.log('\n✅ Environment is valid for production deployment');
} else {
  console.log('\n⚠️ Environment may not be properly configured for production');
  console.log('   Make sure NODE_ENV=production and DATABASE_URL is set');
}

console.log('\n==== End of Verification ====');