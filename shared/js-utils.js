import { promisify } from "util";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import * as argon2 from "argon2";

const scryptAsync = promisify(scrypt);

/**
 * Hash a password using Argon2id (recommended for password hashing)
 * @param {string} password - The plain password to hash
 * @returns {Promise<string>} A secure Argon2id hash with embedded parameters
 */
export async function hashPassword(password) {
  try {
    // Using Argon2id which offers a balanced approach of resistance against side-channel and GPU attacks
    // - memory: 65536 KB (64 MB) - increases memory cost
    // - parallelism: 4 - number of parallel threads
    // - timeCost: 3 - iterations count
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,  // 64 MB
      parallelism: 4,
      timeCost: 3,
    });
    
    return hash; // Argon2 hashes are self-contained with algorithm parameters and salt
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Password hashing failed");
  }
}

/**
 * Compare a password with a hash, handling both legacy and Argon2 formats
 * @param {string} supplied - The supplied password
 * @param {string} stored - The stored hash
 * @returns {Promise<boolean>} True if the password matches the hash
 */
export async function comparePasswords(supplied, stored) {
  if (!stored) return false;
  
  try {
    // Legacy format with dot separator (salt.hash)
    if (stored.includes('.') && !stored.startsWith('$argon2')) {
      const [salt, hash] = stored.split('.');
      if (!salt || !hash) return false;
      
      const suppliedHash = await scryptAsync(supplied, salt, 64);
      const storedHash = Buffer.from(hash, 'hex');
      
      return timingSafeEqual(suppliedHash, storedHash);
    }
    
    // For Argon2 hashes (standard format that begins with $argon2id$)
    if (stored.startsWith('$argon2')) {
      return await argon2.verify(stored, supplied);
    }
    
    // Unknown format
    console.warn("Unknown password hash format encountered");
    return false;
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

/**
 * Generate a unique ID
 * @returns {number} A unique number ID
 */
export function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

/**
 * Check if a username looks like a mock username
 * @param {string} username - The username to check
 * @returns {boolean} True if the username looks like a mock
 */
export function isMockUsername(username) {
  return username.startsWith('test_') || 
         username.startsWith('mock_') || 
         username.startsWith('demo_');
}

/**
 * Format a date to a string
 * @param {Date} date - The date to format
 * @param {boolean} includeTime - Whether to include the time
 * @returns {string} The formatted date string
 */
export function formatDate(date, includeTime = false) {
  if (!date) return '';
  
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return date.toLocaleDateString('en-US', options);
}

/**
 * Deep clone an object
 * @param {any} obj - The object to clone
 * @returns {any} A deep copy of the object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }
  
  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
}