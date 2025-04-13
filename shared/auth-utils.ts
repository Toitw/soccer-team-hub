import crypto from 'crypto';
import { promisify } from 'util';
import { z } from 'zod';

// Password strength requirements
const MIN_PASSWORD_LENGTH = 8;
const REQUIRE_UPPERCASE = true;
const REQUIRE_LOWERCASE = true;
const REQUIRE_NUMBER = true;
const REQUIRE_SPECIAL_CHAR = true;

// Promisify crypto functions
const randomBytes = promisify(crypto.randomBytes);
const scrypt = promisify(crypto.scrypt);

/**
 * Generate a secure random salt
 * @returns A random salt string
 */
export async function generateSalt(): Promise<string> {
  const buffer = await randomBytes(16);
  return buffer.toString('hex');
}

/**
 * Hash a password using scrypt (more secure than bcrypt)
 * @param password - The plain password to hash
 * @returns A string containing the salt and hash, separated by a colon
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await generateSalt();
  const derivedKey = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Compare a plain password with a stored hash
 * @param plainPassword - The plain password to compare
 * @param storedHash - The stored hash (salt:hash format)
 * @returns True if the password matches, false otherwise
 */
export async function comparePasswords(plainPassword: string, storedHash: string | undefined): Promise<boolean> {
  if (!storedHash) return false;

  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;

  const derivedKey = await scrypt(plainPassword, salt, 64) as Buffer;
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    derivedKey
  );
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