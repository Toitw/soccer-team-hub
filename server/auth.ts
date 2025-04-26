import argon2 from 'argon2';
import express, { Express } from 'express';
import expressSession from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { User } from '@shared/schema';
import { storage } from './storage';

// Define session data
declare module 'express-session' {
  interface SessionData {
    user: User;
  }
}

/**
 * Hash a password using Argon2id (recommended for password hashing)
 * @param password - The plain password to hash
 * @returns The hashed password string with Argon2 parameters
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    // Using recommended options for password hashing
    return await argon2.hash(password, {
      type: argon2.argon2id, // Recommended algorithm variant
      memoryCost: 19456,     // 19 MiB memory cost
      timeCost: 2,           // Iterations
      parallelism: 1,        // Parallelism factor
    });
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Compare a plain password with a stored hash
 * @param supplied - The supplied plain password
 * @param stored - The stored password hash
 * @returns Boolean indicating whether passwords match
 */
export async function comparePasswords(supplied: string, stored: string | undefined): Promise<boolean> {
  if (!stored) return false;
  
  try {
    return await argon2.verify(stored, supplied);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

/**
 * Setup authentication middleware and session handling
 */
export function setupAuth(app: Express) {
  const PostgresStore = pgSession(session);
  
  // Session middleware with PostgreSQL store
  app.use(
    session({
      store: new PostgresStore({
        conString: process.env.DATABASE_URL,
        tableName: 'session', // Default table name
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || 'development-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // Add CSRF protection
  app.use((req, res, next) => {
    // Add CSRF header to API responses
    res.setHeader('X-CSRF-Token', req.sessionID || '');
    next();
  });
}