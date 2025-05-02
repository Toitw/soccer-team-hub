// Test script to check PORT handling in the environment
import { ServerEnv, validateServerEnv } from './shared/env-schema.js';

// Test with no PORT env var
delete process.env.PORT;
console.log('Test 1: No PORT environment variable');
try {
  const env1 = validateServerEnv();
  console.log(`-> PORT value: ${env1.PORT}`);
} catch (error) {
  console.error('Error:', error.message);
}

// Test with PORT as a string
process.env.PORT = '8080';
console.log('\nTest 2: PORT=8080 environment variable');
try {
  const env2 = validateServerEnv();
  console.log(`-> PORT value: ${env2.PORT} (type: ${typeof env2.PORT})`);
} catch (error) {
  console.error('Error:', error.message);
}

// Test with weird PORT value
process.env.PORT = 'not-a-number';
console.log('\nTest 3: PORT=not-a-number environment variable');
try {
  const env3 = validateServerEnv();
  console.log(`-> PORT value: ${env3.PORT} (type: ${typeof env3.PORT})`);
} catch (error) {
  console.error('Error:', error.message);
}