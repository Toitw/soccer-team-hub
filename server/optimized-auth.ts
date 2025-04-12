import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { hashPassword, comparePasswords } from "@shared/auth-utils";

declare global {
  namespace Express {
    interface User extends SelectUser {}
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
      const user = await storage.getUser(id);
      
      if (!user) {
        return done(new Error("User not found"), null);
      }
      
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error, null);
    }
  });

  registerAuthRoutes(app);
}

/**
 * Register authentication-related API routes
 */
function registerAuthRoutes(app: Express) {
  // User registration
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
        processTeamJoinCode(joinCode, user);
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

  // User login
  app.post("/api/login", passport.authenticate("local"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication failed" });
      }
      
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

  // User logout
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Error destroying session:", sessionErr);
        }
        
        res.clearCookie('connect.sid');
        res.sendStatus(200);
      });
    });
  });

  // Get current user
  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
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
  
  // Validate team join code
  app.get("/api/validate-join-code/:code", async (req, res) => {
    try {
      const joinCode = req.params.code;
      
      if (!joinCode) {
        return res.status(400).json({ valid: false, message: "No join code provided" });
      }
      
      const team = await storage.getTeamByJoinCode(joinCode);
      
      if (team) {
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

/**
 * Process a team join code for a newly registered user
 */
async function processTeamJoinCode(joinCode: string, user: SelectUser) {
  try {
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
  } catch (error) {
    console.error("Error processing team join code:", error);
  }
}