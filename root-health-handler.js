
/**
 * Standalone root path health check handler for Replit deployments
 * 
 * This script handles root path health checks required by Replit Deployments
 * and starts the main application as a child process.
 */

import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration
const PORT = process.env.PORT || 5000;
const REAL_APP_PORT = 7777; // Internal port for the actual application
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// Logging function
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Start the actual application server on a different port
if (IS_PRODUCTION) {
  log(`Starting main application in ${NODE_ENV} mode on port ${REAL_APP_PORT}...`);

  // Set environment variables for the main app
  const env = {
    ...process.env,
    PORT: REAL_APP_PORT.toString(),
    INTERNAL_SERVER: 'true'
  };

  // Start the real application as a child process
  const appProcess = spawn('node', ['--no-warnings', 'dist/index.js'], {
    env,
    stdio: 'inherit'
  });

  appProcess.on('close', (code) => {
    log(`Main application process exited with code ${code}`);
    // Exit the health check server if the main app crashes
    if (code !== 0) {
      process.exit(code);
    }
  });

  process.on('SIGTERM', () => {
    log('Received SIGTERM, shutting down gracefully');
    appProcess.kill('SIGTERM');
    setTimeout(() => process.exit(0), 1000);
  });

  process.on('SIGINT', () => {
    log('Received SIGINT, shutting down gracefully');
    appProcess.kill('SIGINT');
    setTimeout(() => process.exit(0), 1000);
  });
}

// Create a simple health check server
const server = http.createServer((req, res) => {
  // Only handle requests to the root path
  if (req.url === '/' || req.url === '/health' || req.url === '/health-check') {
    log(`Health check request received: ${req.method} ${req.url} (User-Agent: ${req.headers['user-agent'] || 'Unknown'})`);

    // Set headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Return a 200 response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      message: 'TeamKick API is running',
      environment: NODE_ENV,
      timestamp: new Date().toISOString()
    }));
  } else {
    // For all other paths, return a 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'error',
      message: 'Not found',
      path: req.url
    }));
  }
});

// Start the health check server
server.listen(PORT, '0.0.0.0', () => {
  log(`Health check server listening on port ${PORT}`);
  if (IS_PRODUCTION) {
    log(`Main application running on internal port ${REAL_APP_PORT}`);
  } else {
    log(`DEVELOPMENT MODE: Only the health check endpoint is available`);
  }
});
