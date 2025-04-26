import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { timingSafeEqual, scrypt } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import * as argon2 from "argon2";
import csrf from "csurf";
import { env } from "./bootstrap-env";
import { sessionSettings, ensureSessionTableExists } from "./session";

// Convert callback-based scrypt to Promise-based
const scryptAsync = promisify(scrypt);

/**
 * Hash a password using Argon2id (recommended for password hashing)
 * @param password - The plain password to hash
 * @returns The hashed password string with Argon2 parameters
 */
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456, // 19 MiB
    timeCost: 2, // Iterations
    parallelism: 1,
  });
}

/**
 * Compare a plain password with a stored hash
 * @param supplied - The supplied plain password
 * @param stored - The stored password hash
 * @returns Boolean indicating whether passwords match
 */
export async function comparePasswords(supplied: string, stored: string | undefined): Promise<boolean> {
  // Handle case where stored password is undefined or empty
  if (!stored) return false;
  
  try {
    // Support legacy formats with custom separators (for backward compatibility)
    if (stored.includes('.') || stored.includes(':')) {
      // Extract parts based on separator
      const separator = stored.includes('.') ? '.' : ':';
      const [firstPart, secondPart] = stored.split(separator);
      
      if (!firstPart || !secondPart) return false;
      
      if (stored.includes('.')) {
        // Old format with dot separator (hash.salt)
        const [hash, salt] = stored.split(".");
        // Fallback to old verification using crypto scrypt
        const hashedBuf = Buffer.from(hash, "hex");
        const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
        return timingSafeEqual(hashedBuf, suppliedBuf);
      } else {
        // Format with colon separator (salt:hash)
        const [salt, hash] = stored.split(":");
        // Fallback to old verification using crypto scrypt
        const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
        const storedHashBuf = Buffer.from(hash, 'hex');
        return timingSafeEqual(storedHashBuf, suppliedBuf);
      }
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
 * Create CSRF protection middleware
 */
export function createCsrfProtection() {
  return csrf({ 
    cookie: {
      key: 'csrf-token',
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  });
}

/**
 * Setup authentication for the Express app
 */
export async function setupAuth(app: Express) {
  // Ensure session table exists in the database
  await ensureSessionTableExists();

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  // User serialization for session storage
  passport.serializeUser((user, done) => done(null, user.id));
  
  // User deserialization from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      // Always fetch fresh user data from storage
      const user = await storage.getUser(id);
      
      if (!user) {
        return done(new Error("User not found"), null);
      }
      
      // We only store the user ID in the session and fetch the complete data each time
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error, null);
    }
  });
}