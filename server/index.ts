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

// 2. CORS - restricted to the frontend domain (allow all in development)
// In production, strictly limit to our domain and use secure settings
if (env.NODE_ENV === 'production') {
  // Get allowed origins (either from env var or use our replit app domain as default)
  const allowedOrigins = [
    env.FRONTEND_URL || 'https://teamkick.replit.app',
    'https://' + (process.env.REPL_SLUG || 'teamkick') + '.replit.app'
  ].filter(Boolean);
  
  console.log('CORS allowed origins in production:', allowedOrigins);

  app.use(cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        // Log blocked origins for debugging
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    maxAge: 86400 // 24 hours
  }));
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

// 4. CSRF protection - para rutas mutativas que no usan JWT
const csrfProtection = csrf({ 
  cookie: {
    key: 'csrf-token',
    httpOnly: true,
    secure: env.NODE_ENV === 'production', // Solo HTTPS en producción
    sameSite: 'lax' // Protección contra CSRF en navegadores modernos
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

// Run database seed function to ensure admin user exists
// This is idempotent and safe to run on every startup
seedDatabase().catch(error => {
  logError('Error seeding database', { error: error.message, stack: error.stack });
});

(async () => {
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

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

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
})();
