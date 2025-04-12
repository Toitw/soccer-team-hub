import { promisify } from "util";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";

const scryptAsync = promisify(scrypt);

/**
 * Hash a password using PBKDF2
 * @param {string} password - The plain password to hash
 * @returns {Promise<string>} A string containing the salt and hash, separated by a colon
 */
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}.${hash.toString('hex')}`;
}

/**
 * Compare a password with a hash
 * @param {string} supplied - The supplied password
 * @param {string} stored - The stored hash
 * @returns {Promise<boolean>} True if the password matches the hash
 */
export async function comparePasswords(supplied, stored) {
  if (!stored) return false;
  
  const [salt, hash] = stored.split('.');
  const suppliedHash = await scryptAsync(supplied, salt, 64);
  const storedHash = Buffer.from(hash, 'hex');
  
  return timingSafeEqual(suppliedHash, storedHash);
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