import pino from 'pino';
import pinoHttp from 'pino-http';
import { NODE_ENV, IS_PRODUCTION } from './config';

// Configure the log level (INFO in production, DEBUG in development)
const logLevel = IS_PRODUCTION ? 'info' : 'info';

// Define sensitive fields to redact in logs
const redactOptions = {
  paths: [
    'password', 
    'passwordConfirm',
    'resetPasswordToken',
    'resetPasswordTokenExpiry',
    'verificationToken',
    'verificationTokenExpiry',
    'token',
    'accessToken',
    'refreshToken',
    'req.headers.authorization',
    'req.headers.cookie'
  ],
  censor: '[REDACTED]'
};

// Create the logger instance
export const logger = pino({
  level: logLevel,
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  redact: redactOptions,
  transport: !IS_PRODUCTION
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      } 
    : undefined // In production, use default JSON format
});

// Create HTTP request logger middleware
export const httpLogger = pinoHttp({
  logger,
  // Don't log the entire body in requests
  redact: {
    ...redactOptions,
    paths: [
      ...redactOptions.paths,
      'req.body', // Redact entire body by default
      'res.body'  // Redact response body too
    ]
  },
  customLogLevel: function (req, res, err) {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return 'warn';
    } else if (res.statusCode >= 500 || err) {
      return 'error';
    } else if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
      return 'info';
    }
    return 'info';
  },
  // Custom request serializer to exclude body by default
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
      // Include minimal body information for mutating endpoints (POST,PUT,DELETE)
      // but still protect sensitive information
      bodyInfo: req.method !== 'GET' ? {
        endpoint: req.url,
        operation: req.method
      } : undefined,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length']
      }
    })
  }
});

// Export format for structured log messages
export function logStructured(event: string, data?: any, level: 'info' | 'warn' | 'error' | 'debug' = 'info') {
  if (data) {
    logger[level]({ event, data });
  } else {
    logger[level]({ event });
  }
}

// Utility to log API requests with structured data
export function logApiRequest(method: string, url: string, userId: number | null = null, data: any = null) {
  logStructured('api_request', {
    method,
    url,
    userId,
    hasData: data !== null
  });
}

// Utility to log authenticated user actions
export function logUserAction(userId: number, action: string, details: any = null) {
  logStructured('user_action', {
    userId,
    action,
    details
  });
}

// Replace any console.log statements
export function logInfo(message: string, ...args: any[]) {
  logger.info(message, ...args);
}

export function logWarn(message: string, ...args: any[]) {
  logger.warn(message, ...args);
}

export function logError(message: string, ...args: any[]) {
  logger.error(message, ...args);
}

export function logDebug(message: string, ...args: any[]) {
  logger.debug(message, ...args);
}

// Export default logger for convenience
export default logger;