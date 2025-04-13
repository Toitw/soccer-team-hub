import { promisify } from "util";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { z } from "zod";

const scryptAsync = promisify(scrypt);

// Constants for password hashing
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_COST_FACTOR = 16384; // Higher cost factor = more secure but slower
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

/**
 * Hash a password using scrypt with improved parameters
 * @param password - The password to hash
 * @returns A string containing the parameters and hash, separated by dots
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  
  // Use scrypt with reasonable defaults
  const hash = await scryptAsync(password, salt, SCRYPT_KEY_LENGTH) as Buffer;
  
  // Store the salt and hash
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
  
  try {
    // Parse the stored hash components
    const [salt, costFactorStr, blockSizeStr, parallelizationStr, hash] = stored.split('.');
    
    // Handle legacy format if needed
    if (!blockSizeStr || !parallelizationStr) {
      // Legacy format (salt.hash)
      const legacyHash = await scryptAsync(supplied, salt, 64) as Buffer;
      const storedHash = Buffer.from(hash || costFactorStr, 'hex');
      return timingSafeEqual(legacyHash, storedHash);
    }
    
    // Parse parameters
    const costFactor = parseInt(costFactorStr, 10);
    const blockSize = parseInt(blockSizeStr, 10);
    const parallelization = parseInt(parallelizationStr, 10);
    
    // Hash the supplied password with the same parameters
    const suppliedHash = await scryptAsync(
      supplied, 
      salt, 
      SCRYPT_KEY_LENGTH, 
      { 
        N: costFactor, 
        r: blockSize, 
        p: parallelization 
      }
    ) as Buffer;
    
    const storedHash = Buffer.from(hash, 'hex');
    
    return timingSafeEqual(suppliedHash, storedHash);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

/**
 * Generate a secure verification token
 * @returns A random string token
 */
export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate a token expiry timestamp
 * @param hours - Number of hours until expiry
 * @returns Timestamp when the token expires
 */
export function generateTokenExpiry(hours: number = 24): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
}

/**
 * Password validation schema with security requirements
 */
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password is too long")
  .refine(
    password => /[A-Z]/.test(password),
    "Password must contain at least one uppercase letter"
  )
  .refine(
    password => /[0-9]/.test(password),
    "Password must contain at least one number"
  )
  .refine(
    password => /[^A-Za-z0-9]/.test(password),
    "Password must contain at least one special character"
  );

/**
 * Email validation schema
 */
export const emailSchema = z.string()
  .email("Invalid email format")
  .max(255, "Email is too long");

/**
 * Username validation schema
 */
export const usernameSchema = z.string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .refine(
    username => /^[a-zA-Z0-9_.-]+$/.test(username),
    "Username can only contain letters, numbers, underscores, dots, and hyphens"
  );

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