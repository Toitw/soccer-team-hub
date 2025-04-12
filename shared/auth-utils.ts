import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

// Shared scrypt implementation
const scryptAsync = promisify(scrypt);

/**
 * Hash a password using PBKDF2
 * @param password - The plain password to hash
 * @returns A string containing the salt and hash, separated by a colon
 */
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Compare a supplied password with a stored hash
 * @param supplied - The plain password to verify
 * @param stored - The stored hash to compare against
 * @returns True if the passwords match, false otherwise
 */
export async function comparePasswords(supplied: string, stored: string | undefined) {
  if (!stored) return false;
  
  // Extract the salt from the stored hash
  const [_, salt] = stored.split(".");
  
  // Hash the supplied password with the same salt
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  const hashedSupplied = `${buf.toString("hex")}.${salt}`;
  
  // Compare the hashes
  return stored === hashedSupplied;
}