/**
 * Enhanced security headers configuration for production
 */
import { env } from './env';

// Base Content Security Policy for the application
const baseCSP = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"], // Inline styles are needed for Tailwind/shadcn
  imgSrc: ["'self'", "data:"],
  connectSrc: ["'self'"],
  fontSrc: ["'self'", "data:"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  frameSrc: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'self'"],
  baseUri: ["'self'"],
  manifestSrc: ["'self'"],
  workerSrc: ["'self'", "blob:"]
};

// Development-specific CSP additions
const developmentCSP = {
  scriptSrc: [...baseCSP.scriptSrc, "'unsafe-inline'", "'unsafe-eval'"],
  connectSrc: [...baseCSP.connectSrc, "ws:", "wss:"] // WebSocket for hot reloading
};

/**
 * Get the Content Security Policy configuration based on environment
 */
export function getCSP() {
  const csp = { ...baseCSP };
  
  // Add development-specific directives
  if (env.NODE_ENV === 'development') {
    csp.scriptSrc = developmentCSP.scriptSrc;
    csp.connectSrc = developmentCSP.connectSrc;
  }
  
  return csp;
}

/**
 * Get the complete security headers configuration
 */
export function getSecurityHeaders() {
  return {
    // Content Security Policy
    contentSecurityPolicy: {
      directives: getCSP()
    },
    
    // Strict Transport Security
    // Only enable in production and with HTTPS
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: env.NODE_ENV === 'production'
    },
    
    // X-Frame protection
    frameguard: {
      action: 'sameorigin'
    },
    
    // Enable DNS prefetching for better performance
    dnsPrefetchControl: {
      allow: false
    },
    
    // Disable browser's MIME type sniffing
    noSniff: true,
    
    // Default permissions policy
    permissionsPolicy: {
      features: {
        camera: ["'none'"],
        geolocation: ["'none'"],
        microphone: ["'none'"],
        payment: ["'none'"],
        usb: ["'none'"],
        syncXhr: ["'none'"],
        accelerometer: ["'none'"],
        gyroscope: ["'none'"],
        magnetometer: ["'none'"],
        midi: ["'none'"],
        notifications: ["'none'"]
      }
    },
    
    // X-XSS-Protection is deprecated but kept for older browsers
    xssFilter: true,
    
    // Referrer policy
    referrerPolicy: {
      policy: 'no-referrer'
    },
    
    // Cross-Origin settings
    crossOriginEmbedderPolicy: false, // Set to false to avoid issues with third-party resources
    crossOriginResourcePolicy: { policy: 'same-site' as const },
    crossOriginOpenerPolicy: { policy: 'same-origin' as const },
    
    // Origin agent cluster for performance isolation
    originAgentCluster: true
  };
}