import express, { Express, Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import path from "path";
import { storage } from "./storage-implementation";
import { comparePasswords } from "@shared/auth-utils";
import { User } from "@shared/schema";
import { Server } from "http";

// Set up auth config
function setupAuth(app: Express) {
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
        // Support both email and username authentication
        let user;
        if (username.includes('@')) {
          // If input contains @, treat as email
          user = await storage.getUserByEmail(username);
        } else {
          // Otherwise, treat as username
          user = await storage.getUserByUsername(username);
        }
        
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
}

// Create and configure Express app
export function createApp(): Express {
  const app = express();
  
  // Middleware
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  
  // Set up authentication
  setupAuth(app);
  
  // Initialize auth routes
  setupAuthRoutes(app);
  
  // Initialize API routes (placeholder)
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  
  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({ error: message });
  });
  
  return app;
}

// Auth route setup
function setupAuthRoutes(app: Express) {
  // User login
  app.post("/api/login", passport.authenticate("local"), async (req: Request, res: Response) => {
    const user = req.user as User;
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });
  
  // User logout
  app.post("/api/logout", (req: Request, res: Response, next: NextFunction) => {
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
  app.get("/api/user", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const currentUser = await storage.getUser((req.user as User).id);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...userWithoutPassword } = currentUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });
}

// Start the server
export async function startServer(port = 5000): Promise<Server> {
  const app = createApp();
  
  return new Promise((resolve) => {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
      resolve(server);
    });
  });
}

// Run if this file is executed directly
if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
  startServer(port).catch(console.error);
}