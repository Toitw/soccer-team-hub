import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { Store as SessionStore } from "express-session";
import { randomBytes, timingSafeEqual, scrypt } from "crypto";
import { promisify } from "util";
import { storage } from "./storage-implementation";
import { User as SelectUser } from "@shared/schema";
import { UserRole } from "@shared/roles";
import * as argon2 from "argon2";

const scryptAsync = promisify(scrypt);

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
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
      
      // scryptAsync is already defined at the module level
      
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

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "teamkick-soccer-platform-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

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

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      // Always fetch fresh user data from storage
      const user = await storage.getUser(id);
      
      if (!user) {
        // Instead of error, return null to handle gracefully
        console.log(`Session references deleted user ID: ${id}, clearing session`);
        return done(null, null);
      }
      
      // We only store the user ID in the session and fetch the complete data each time
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(null, null);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      // Create the user
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      // Check if a team join code was provided
      const joinCode = req.body.joinCode;
      if (joinCode) {
        // Look up the team by join code
        const team = await storage.getTeamByJoinCode(joinCode);
        if (team) {
          // Add the user as a member of the team
          await storage.createTeamMember({
            teamId: team.id,
            userId: user.id,
            fullName: user.fullName || user.username,
            createdById: user.id,
            role: UserRole.PLAYER,  // New users join as regular players
            isVerified: true
          });
          
          console.log(`User ${user.username} joined team ${team.name} using join code`);
        }
      }

      req.login(user, (err) => {
        if (err) return next(err);
        
        // Don't send the password to the client
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Error during registration:", error);
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication failed" });
      }
      
      // Get fresh user data directly from storage to ensure we have the most up-to-date information
      const freshUser = await storage.getUser(req.user.id);
      
      if (!freshUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Don't send the password to the client
      const { password, ...userWithoutPassword } = freshUser;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching fresh user data on login:", error);
      
      // Fall back to session user if we can't get fresh data
      if (req.user) {
        const { password, ...userWithoutPassword } = req.user as SelectUser;
        res.status(200).json(userWithoutPassword);
      } else {
        res.status(500).json({ error: "Failed to retrieve user data" });
      }
    }
  });

  app.post("/api/logout", (req, res, next) => {
    // First log out the user from passport
    req.logout((err) => {
      if (err) return next(err);
      
      // Then destroy the session completely to ensure clean state
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Error destroying session:", sessionErr);
        }
        
        // Clear the session cookie
        res.clearCookie('connect.sid');
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Always fetch the most up-to-date user data from storage
      const currentUser = await storage.getUser(req.user.id);
      
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Don't send the password to the client
      const { password, ...userWithoutPassword } = currentUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });
  
  // Endpoint to validate a team join code without requiring authentication
  app.get("/api/validate-join-code/:code", async (req, res) => {
    try {
      const joinCode = req.params.code;
      
      // If no join code provided
      if (!joinCode) {
        return res.status(400).json({ valid: false, message: "No join code provided" });
      }
      
      // Look up the team by join code
      const team = await storage.getTeamByJoinCode(joinCode);
      
      if (team) {
        // Return basic team info without sensitive details
        return res.json({ 
          valid: true, 
          team: {
            id: team.id,
            name: team.name,
            logo: team.logo
          }
        });
      } else {
        return res.json({ 
          valid: false, 
          message: "Invalid join code"
        });
      }
    } catch (error) {
      console.error("Error validating join code:", error);
      res.status(500).json({ 
        valid: false, 
        message: "Error validating join code"
      });
    }
  });

  // Temporary endpoint to get TEST team join code
  app.get("/api/get-test-team-code", async (req, res) => {
    try {
      const teams = await storage.getAllTeams();
      const testTeam = teams.find(team => team.name.toLowerCase().includes('test'));
      
      if (testTeam) {
        return res.json({ 
          teamName: testTeam.name,
          joinCode: testTeam.joinCode 
        });
      } else {
        return res.json({ message: "No test team found" });
      }
    } catch (error) {
      console.error("Error getting test team:", error);
      res.status(500).json({ error: "Failed to get test team" });
    }
  });
}
