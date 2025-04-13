import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  // Use the same format as shared/auth-utils.ts: salt:hash
  return `${salt}:${buf.toString("hex")}`;
}

export async function comparePasswords(supplied: string, stored: string | undefined) {
  // Handle case where stored password is undefined or empty
  if (!stored) {
    console.log("DEBUG: Stored password is undefined or empty");
    return false;
  }
  
  console.log("DEBUG: Comparing passwords");
  console.log("DEBUG: Supplied password (length):", supplied.length);
  console.log("DEBUG: Stored password format:", stored.substring(0, 10) + "...");
  
  try {
    // Support both old and new formats
    if (stored.includes('.')) {
      // Old format with dot separator (hash.salt)
      console.log("DEBUG: Using old format with dot separator");
      const [hashed, salt] = stored.split(".");
      if (!hashed || !salt) {
        console.log("DEBUG: Invalid hash or salt in old format");
        return false;
      }
      
      console.log("DEBUG: Salt (old format):", salt.substring(0, 5) + "...");
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      const result = timingSafeEqual(hashedBuf, suppliedBuf);
      console.log("DEBUG: Password comparison result (old format):", result);
      return result;
    } else if (stored.includes(':')) {
      // New format with colon separator (salt:hash)
      console.log("DEBUG: Using new format with colon separator");
      const [salt, hash] = stored.split(":");
      if (!salt || !hash) {
        console.log("DEBUG: Invalid salt or hash in new format");
        return false;
      }
    
      console.log("DEBUG: Salt (new format):", salt.substring(0, 5) + "...");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      const storedHashBuf = Buffer.from(hash, 'hex');
      
      console.log("DEBUG: Supplied hash length:", suppliedBuf.length);
      console.log("DEBUG: Stored hash length:", storedHashBuf.length);
      
      const result = timingSafeEqual(storedHashBuf, suppliedBuf);
      console.log("DEBUG: Password comparison result (new format):", result);
      return result;
    } else {
      console.log("DEBUG: Unknown password format, no separator found");
      return false;
    }
  } catch (error) {
    console.error("DEBUG: Error comparing passwords:", error);
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
      // This is critical to ensure we don't use stale user data
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
            role: "player"  // New users join as regular players
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
}
