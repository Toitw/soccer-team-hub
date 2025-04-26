// Import bootstrap-env before all other imports to ensure environment is loaded
import './bootstrap-env';

import express, { Request, Response, NextFunction } from "express";
import passport from "passport";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bodyParser from "body-parser";
import { setupAuth, createCsrfProtection, hashPassword } from "./auth";
import { storage } from "./storage";
import { performHealthCheck } from "./db";
import pinoHttp from "pino-http";
import pino from "pino";

// Create logger for structured logging
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

const logError = (message: string, context: Record<string, any> = {}) => {
  logger.error({ ...context, message });
};

// Initialize Express app
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// Add HTTP request logging
app.use(pinoHttp({ logger }));

// Standard security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      scriptSrcAttr: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
}));

// Request parsing middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Health check endpoint for uptime monitoring
app.get('/healthz', async (req, res) => {
  const dbStatus = await performHealthCheck();
  if (dbStatus) {
    res.status(200).json({ ok: true, database: 'connected' });
  } else {
    res.status(500).json({ ok: false, database: 'error' });
  }
});

// Set up authentication (this initializes passport and session handling)
(async () => {
  try {
    await setupAuth(app);
    
    // CSRF protection for API routes
    const csrfProtection = createCsrfProtection();
    
    // Route to get a new CSRF token
    app.get('/api/csrf-token', csrfProtection, (req, res) => {
      res.json({ csrfToken: req.csrfToken() });
    });
    
    // API routes
    // Test endpoint to create a test user (for development only)
    app.post("/api/test/create-user", async (req, res) => {
      try {
        // Check if a test user already exists
        const existingUser = await storage.getUserByUsername('testuser');
        
        if (existingUser) {
          return res.status(200).json({ 
            message: 'Test user already exists',
            user: { id: existingUser.id, username: existingUser.username }
          });
        }
        
        // Create a test user
        const hashedPassword = await hashPassword('password123');
        const newUser = await storage.createUser({
          username: 'testuser',
          password: hashedPassword,
          fullName: 'Test User',
          role: 'player',
          profilePicture: null,
          position: null,
          jerseyNumber: null,
          email: 'test@example.com',
          phoneNumber: null,
          bio: null,
          verificationToken: null,
          verificationTokenExpiry: null,
          verified: true,
          resetPasswordToken: null,
          resetPasswordTokenExpiry: null,
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // Return success without the password
        const { password, ...userWithoutPassword } = newUser;
        res.status(201).json({ 
          message: 'Test user created successfully',
          user: userWithoutPassword
        });
      } catch (error) {
        console.error('Error creating test user:', error);
        res.status(500).json({ error: 'Failed to create test user' });
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
        res.status(500).json({ error: "Failed to retrieve user data" });
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
          
          res.clearCookie('app.sid');
          res.sendStatus(200);
        });
      });
    });
    
    // Get current user
    app.get("/api/user", async (req, res) => {
      if (!req.isAuthenticated()) {
        return res.sendStatus(401);
      }
      
      try {
        const user = req.user;
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Failed to fetch user data" });
      }
    });
    
    // Error handler for CSRF errors
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      if (err.code === 'EBADCSRFTOKEN') {
        logger.warn({
          type: 'security_event',
          event: 'csrf_attack_attempt',
          path: req.path,
          method: req.method,
          ip: req.ip,
        });
        
        return res.status(403).json({ 
          error: 'Request rejected: possible CSRF attack detected' 
        });
      }
      
      next(err);
    });
    
    // Add a root route for testing API functionality
    app.get('/', (req, res) => {
      res.status(200).json({ 
        message: 'API server is running',
        auth: req.isAuthenticated() ? 'Authenticated' : 'Not authenticated',
        user: req.user ? { id: req.user.id, role: req.user.role } : null
      });
    });
    
    // Global error handler
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      logger.error({
        type: 'error_handler',
        path: req.path,
        method: req.method,
        statusCode: status,
        errorMessage: message,
        stack: err.stack,
        userId: (req as any).user?.id
      });
      
      res.status(status).json({ error: message });
    });
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();