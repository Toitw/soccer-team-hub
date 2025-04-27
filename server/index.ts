import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import csrf from "csurf";
import cookieParser from "cookie-parser";
import seedDatabase from "./seed";
import { logger, httpLogger, logError } from "./logger";
import { env } from "./env";
import { pool } from "./db";
import { setupGlobalErrorHandlers, addDiagnosticEndpoints, recordError, checkForRecordedErrors } from "./error-diagnosis";
import { healthRouter } from "./health-check";

const app = express();

// Add HTTP request logging middleware (before any other middlewares)
app.use(httpLogger);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(cookieParser()); // Necesario para CSRF con cookies

// Security middleware
// 1. Helmet for securing HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for development
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
}));

// 2. CORS - Initially more permissive for troubleshooting production issues
// When 5XX errors are resolved, you can tighten this security back up
if (env.NODE_ENV === 'production') {
  // In production, we'll be more flexible with origins to help troubleshoot issues
  // This is a temporary measure to help diagnose 5XX errors
  logger.info('Using flexible CORS in production to troubleshoot 5XX errors');
  
  app.use(cors({
    origin: true, // Allow all origins temporarily for troubleshooting
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    maxAge: 86400 // 24 hours
  }));

  // Once 5XX errors are resolved, you should use a stricter CORS configuration:
  /*
  const allowedOrigins = [
    env.FRONTEND_URL || 'https://teamkick.replit.app',
    'https://' + (process.env.REPL_SLUG || 'teamkick') + '.replit.app'
  ].filter(Boolean);
  
  logger.info('CORS allowed origins in production:', allowedOrigins);

  app.use(cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        // Log blocked origins for debugging
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    maxAge: 86400 // 24 hours
  }));
  */
} else {
  // In development, allow all origins
  app.use(cors({
    origin: true,
    credentials: true
  }));
}

// 3. Rate limiting - 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests from this IP, please try again after 15 minutes"
});

// Apply rate limiting to API routes only
app.use("/api", apiLimiter);

// 4. CSRF protection - more permissive settings for troubleshooting
const csrfProtection = csrf({ 
  cookie: {
    key: 'csrf-token',
    httpOnly: true,
    secure: false, // Temporarily disable secure requirement for troubleshooting
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax' // More permissive for production
  }
});

// Ruta para obtener el token CSRF
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Error handler para errores de CSRF
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.code === 'EBADCSRFTOKEN') {
    // Log the CSRF attack attempt with structured data
    logger.warn({
      type: 'security_event',
      event: 'csrf_attack_attempt',
      path: req.path,
      method: req.method,
      ip: req.ip,
      headers: {
        'user-agent': req.headers['user-agent'],
        'host': req.headers['host'],
        'referer': req.headers['referer']
      }
    });
    
    // Error de CSRF
    return res.status(403).json({ 
      error: 'Solicitud rechazada: posible ataque CSRF detectado' 
    });
  }
  // Pasa otros errores al siguiente middleware
  next(err);
});

// Track response times and format for structured logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Log relevant information without sensitive data
      logger.info({
        type: 'api_response',
        method: req.method,
        path: path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentType: res.getHeader('content-type'),
        contentLength: res.getHeader('content-length'),
        userId: (req as any).user?.id
      });
    }
  });

  next();
});

// Initialize the global error handlers to catch unhandled errors
setupGlobalErrorHandlers();

// Add diagnostic endpoints (only in production)
addDiagnosticEndpoints(app);

// Run database seed function to ensure admin user exists
// This is idempotent and safe to run on every startup
seedDatabase().catch(error => {
  logError('Error seeding database', { error: error.message, stack: error.stack });
});

(async () => {
  try {
    // Ensure the sessions table exists in production before starting server
    if (env.NODE_ENV === 'production') {
      try {
        // Simple check if the sessions table exists
        await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_name = 'sessions'
          );
        `);
        logger.info('Sessions table verified');
      } catch (err) {
        logger.warn('Creating sessions table for production use');
        try {
          // Create the sessions table if it doesn't exist
          await pool.query(`
            CREATE TABLE IF NOT EXISTS "sessions" (
              "sid" varchar NOT NULL COLLATE "default",
              "sess" json NOT NULL,
              "expire" timestamp(6) NOT NULL,
              CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
            );
            CREATE INDEX IF NOT EXISTS "IDX_sessions_expire" ON "sessions" ("expire");
          `);
          logger.info('Sessions table created successfully');
        } catch (createErr) {
          logger.error('Failed to create sessions table', { error: (createErr as Error).message });
          // Continue anyway, the app may still function with memory-based sessions
        }
      }
    }
    
    const server = await registerRoutes(app);

    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Enhanced error logging for troubleshooting
      logger.error({
        type: 'error_handler',
        path: req.path,
        method: req.method,
        statusCode: status,
        errorMessage: message,
        errorName: err.name,
        errorCode: err.code,
        stack: err.stack,
        userId: (req as any).user?.id,
        query: req.query,
        originalUrl: req.originalUrl,
        headers: {
          host: req.headers.host,
          origin: req.headers.origin,
          referer: req.headers.referer,
          'user-agent': req.headers['user-agent']
        }
      });

      // In production, don't expose error details to clients
      if (env.NODE_ENV === 'production') {
        // Generic error message and status code for clients
        res.status(status).json({ 
          message: status === 500 ? 'Internal Server Error' : message,
          status: status
        });
      } else {
        // In development, provide more error details
        res.status(status).json({ 
          message,
          error: err.name || 'Error',
          stack: err.stack,
          status: status
        });
      }
    });

    // Mount health check endpoints BEFORE vite setup
    // This ensures these routes take precedence over vite in development
    app.use('/', healthRouter);
    
    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Add a catch-all route handler for unmatched API routes
    app.use('/api/*', (req, res) => {
      logger.warn(`Unmatched API route requested: ${req.originalUrl}`);
      res.status(404).json({ error: 'API endpoint not found' });
    });

    // Add a fallback route for all other requests that should serve the frontend
    app.use('*', (req, res) => {
      if (env.NODE_ENV === 'production') {
        res.sendFile('index.html', { root: './client/dist' });
      } else {
        res.status(404).send('Not found - development mode. Try accessing through the Vite dev server.');
      }
    });

    // Serve the app on the configured port (defaults to 5000)
    // This serves both the API and the client
    const port = env.PORT;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      logger.info(`Server running in ${env.NODE_ENV} mode on port ${port}`);
    });
    
    // Handle server errors
    server.on('error', (err) => {
      // Use the diagnostic error recording
      recordError('Server runtime error', err as Error, {
        environment: env.NODE_ENV,
        processMemoryUsage: process.memoryUsage(),
        errorContext: 'server_runtime'
      });
      
      // Don't exit in production to allow for recovery
      if (env.NODE_ENV !== 'production') {
        process.exit(1);
      }
    });
  } catch (err) {
    // Log the error using our enhanced diagnostic tools
    recordError('Fatal server initialization error', err as Error, {
      environment: env.NODE_ENV,
      processMemoryUsage: process.memoryUsage(),
      errorContext: 'server_startup'
    });
    
    if (env.NODE_ENV !== 'production') {
      process.exit(1);
    } else {
      // In production, try to at least have a minimal server that can report the issue
      // and doesn't just crash immediately
      const emergencyApp = express();
      emergencyApp.use(express.json());
      
      // Add a health check that reports the error
      emergencyApp.get('/api/health', (req, res) => {
        res.status(500).json({
          status: 'error',
          message: 'Server in emergency mode due to initialization error',
          error: {
            type: (err as Error).name,
            message: (err as Error).message
          },
          timestamp: new Date().toISOString()
        });
      });
      
      // Add diagnostic endpoint to help troubleshoot in production
      emergencyApp.get('/api/diagnostic', (req, res) => {
        const errors = checkForRecordedErrors();
        res.json({
          timestamp: new Date().toISOString(),
          environment: env.NODE_ENV,
          errorCount: errors.length,
          errors: errors.slice(-10), // Return the most recent 10 errors
          currentError: {
            name: (err as Error).name,
            message: (err as Error).message,
            stack: (err as Error).stack
          }
        });
      });
      
      // Create a dedicated router for emergency health checks
      const emergencyHealthRouter = express.Router();
      
      // Root endpoint for health checks (required for deployment platforms)
      emergencyHealthRouter.get('/', (req: Request, res: Response) => {
        res.status(200).json({
          status: 'degraded',
          service: 'team-management-app',
          environment: env.NODE_ENV,
          timestamp: new Date().toISOString(),
          message: 'Application is in emergency mode'
        });
      });
      
      // Health check endpoint using the standard /healthz convention
      emergencyHealthRouter.get('/healthz', (req: Request, res: Response) => {
        res.status(200).json({
          status: 'degraded',
          service: 'team-management-app',
          environment: env.NODE_ENV,
          timestamp: new Date().toISOString(),
          message: 'Application is in emergency mode'
        });
      });
      
      // Mount the emergency health router at the beginning
      emergencyApp.use('/', emergencyHealthRouter);
      
      // Default response for all other routes
      emergencyApp.use('*', (req: Request, res: Response) => {
        res.status(500).send('Server is temporarily unavailable. Please try again later.');
      });
      
      // Start the emergency server
      emergencyApp.listen(env.PORT, '0.0.0.0', () => {
        logger.info(`Emergency server running on port ${env.PORT}`);
      });
    }
  }
})();
