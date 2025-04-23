import crypto from 'crypto';
import { promisify } from 'util';
import { z } from 'zod';
import * as argon2 from 'argon2';

// Password strength requirements
const MIN_PASSWORD_LENGTH = 8;
const REQUIRE_UPPERCASE = true;
const REQUIRE_LOWERCASE = true;
const REQUIRE_NUMBER = true;
const REQUIRE_SPECIAL_CHAR = true;

// Promisify crypto functions
const randomBytes = promisify(crypto.randomBytes);

/**
 * Generate a secure random salt
 * @returns A random salt string
 */
export async function generateSalt(): Promise<string> {
  const buffer = await randomBytes(16);
  return buffer.toString('hex');
}

/**
 * Hash a password using Argon2id (recommended for password hashing)
 * @param password - The plain password to hash
 * @returns The hashed password string with Argon2 parameters
 */
export async function hashPassword(password: string): Promise<string> {
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
 * Compare a plain password with a stored hash
 * @param plainPassword - The plain password to compare
 * @param storedHash - The stored hash
 * @returns True if the password matches, false otherwise
 */
export async function comparePasswords(plainPassword: string, storedHash: string | undefined): Promise<boolean> {
  if (!storedHash) return false;

  try {
    // Handle legacy format (salt:hash)
    if (storedHash.includes(':')) {
      const [salt, hash] = storedHash.split(':');
      if (!salt || !hash) return false;

      // Legacy verification for old password hashes
      const scrypt = promisify(crypto.scrypt);
      const derivedKey = await scrypt(plainPassword, salt, 64) as Buffer;
      return crypto.timingSafeEqual(
        Buffer.from(hash, 'hex'),
        derivedKey
      );
    }
    
    // For Argon2 hashes (standard format that begins with $argon2id$)
    if (storedHash.startsWith('$argon2')) {
      return await argon2.verify(storedHash, plainPassword);
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
 * Generate a secure random token for email verification or password reset
 * @returns A random token string
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate an expiry timestamp for a token
 * @param hours - Number of hours until expiry
 * @returns A Date object representing the expiry time
 */
export function generateTokenExpiry(hours: number): Date {
  const expiryTime = new Date();
  expiryTime.setHours(expiryTime.getHours() + hours);
  return expiryTime;
}

/**
 * Password validation schema with security requirements
 */
export const passwordSchema = z.string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(100, "Password is too long")
  .refine(
    password => !REQUIRE_UPPERCASE || /[A-Z]/.test(password),
    "Password must contain at least one uppercase letter"
  )
  .refine(
    password => !REQUIRE_LOWERCASE || /[a-z]/.test(password),
    "Password must contain at least one lowercase letter"
  )
  .refine(
    password => !REQUIRE_NUMBER || /[0-9]/.test(password),
    "Password must contain at least one number"
  )
  .refine(
    password => !REQUIRE_SPECIAL_CHAR || /[^A-Za-z0-9]/.test(password),
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