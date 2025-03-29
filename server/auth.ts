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
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string | undefined) {
  // Handle case where stored password is undefined or empty
  if (!stored) return false;
  
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) return false;
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
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

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        
        // Don't send the password to the client
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
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
}
