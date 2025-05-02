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
import healthCheckRoutes from './health-check';
import replitHealthCheckRouter from './replit-health-check';
import productionRootHandler from './production-root-handler';
import { errorHandler, notFoundHandler } from './error-handler';
import { getSecurityHeaders } from './security-headers';
import path from 'path';
import fs from 'fs';

const app = express();

// Add HTTP request logging middleware (before any other middlewares)
app.use(httpLogger);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(cookieParser()); // Necesario para CSRF con cookies

// Security middleware
// 1. Helmet for securing HTTP headers with enhanced configuration
app.use(helmet(getSecurityHeaders()));

// 2. CORS - restricted to the frontend domain (allow all in development)
app.use(cors({
  origin: env.NODE_ENV === 'production' 
    ? env.FRONTEND_URL || 'https://teamkick.replit.app' 
    : true,
  credentials: true,
}));

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
  
  // Register health check routes
  app.use('/api', healthCheckRoutes);
  
  // For Replit Deployments, we need dedicated health check endpoints
  // This is necessary because the Vite middleware in development and the static 
  // middleware in production catch all routes
  app.use('/health-check', replitHealthCheckRouter);
  
  // Use the 404 handler for API routes
  app.use(notFoundHandler);
  
  // Use the enhanced error handler
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    // In production, register a special root handler for Replit deployments
    // IMPORTANT: This must be registered BEFORE the static middleware so it can
    // intercept the root path for health checks
    app.use('/', productionRootHandler);
    
    // Then serve static files for all other routes
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
