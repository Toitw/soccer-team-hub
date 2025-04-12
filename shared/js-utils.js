import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

// Shared scrypt implementation
const scryptAsync = promisify(scrypt);

/**
 * Hash a password using PBKDF2
 * @param {string} password - The plain password to hash
 * @returns {Promise<string>} A string containing the salt and hash, separated by a colon
 */
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64));
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Compare a supplied password with a stored hash
 * @param {string} supplied - The plain password to verify
 * @param {string} stored - The stored hash to compare against
 * @returns {Promise<boolean>} True if the passwords match, false otherwise
 */
export async function comparePasswords(supplied, stored) {
  if (!stored) return false;
  
  // Extract the salt from the stored hash
  const [_, salt] = stored.split(".");
  
  // Hash the supplied password with the same salt
  const buf = (await scryptAsync(supplied, salt, 64));
  const hashedSupplied = `${buf.toString("hex")}.${salt}`;
  
  // Compare the hashes
  return stored === hashedSupplied;
}

/**
 * Utility function to check if a username is a mock username
 * @param {string} username - The username to check
 * @returns {boolean} True if the username is a mock username
 */
export function isMockUsername(username) {
  return (
    username.startsWith('mock_') || 
    username.startsWith('test_') || 
    username.startsWith('dev_')
  );
}

/**
 * Generate a random join code for team registration
 * @returns {string} A random 6-character join code
 */
export function generateJoinCode() {
  // Generate a random string (letters + numbers) of length 6
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }
  
  return code;
}