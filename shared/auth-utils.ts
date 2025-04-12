import { promisify } from "util";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";

const scryptAsync = promisify(scrypt);

/**
 * Hash a password using scrypt
 * @param password - The password to hash
 * @returns A string containing the salt and hash, separated by a dot
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64) as Buffer;
  return `${salt}.${hash.toString('hex')}`;
}

/**
 * Compare a password with a hash
 * @param supplied - The supplied password
 * @param stored - The stored hash
 * @returns True if the password matches the hash
 */
export async function comparePasswords(supplied: string, stored: string | undefined): Promise<boolean> {
  if (!stored) return false;
  
  const [salt, hash] = stored.split('.');
  const suppliedHash = await scryptAsync(supplied, salt, 64) as Buffer;
  const storedHash = Buffer.from(hash, 'hex');
  
  return timingSafeEqual(suppliedHash, storedHash);
}

/**
 * Check if a username is a mock username
 * @param username - The username to check
 * @returns True if the username is a mock username
 */
export function isMockUsername(username: string): boolean {
  return username.startsWith('test_') || 
         username.startsWith('mock_') || 
         username.startsWith('demo_');
}