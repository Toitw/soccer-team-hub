
/**
 * Standalone root path health check handler for Replit deployments
 */

import http from 'http';
import { spawn } from 'child_process';

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

// Start the actual application server on the internal port
let appProcess;
if (IS_PRODUCTION) {
  log(`Starting main application in ${NODE_ENV} mode on port ${REAL_APP_PORT}...`);

  // Set environment variables for the main app - ensure PORT is explicitly set to 7777
  const env = {
    ...process.env,
    PORT: REAL_APP_PORT.toString(),
    NODE_ENV: 'production',
    INTERNAL_SERVER: 'true'
  };

  // Start the real application as a child process
  // Explicitly use dist/index.js as the entry point
  appProcess = spawn('node', ['dist/index.js'], {
    env,
    stdio: 'inherit'
  });

  appProcess.on('close', (code) => {
    log(`Main application process exited with code ${code}`);
    if (code !== 0) {
      log('Attempting to restart main application...');
      setTimeout(() => {
        if (appProcess) appProcess.kill();
        // Try to restart the application
        appProcess = spawn('node', ['dist/server/index.js'], {
          env,
          stdio: 'inherit'
        });
      }, 5000);
    }
  });

  process.on('SIGTERM', () => {
    log('Received SIGTERM, shutting down gracefully');
    if (appProcess) appProcess.kill('SIGTERM');
    setTimeout(() => process.exit(0), 1000);
  });

  process.on('SIGINT', () => {
    log('Received SIGINT, shutting down gracefully');
    if (appProcess) appProcess.kill('SIGINT');
    setTimeout(() => process.exit(0), 1000);
  });
}

// Create an HTTP proxy to forward requests to the main application
const proxy = http.createServer((req, res) => {
  // Special case for health checks
  if (req.url === '/' && isHealthCheck(req)) {
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
    return;
  }

  // For all other requests, proxy to the main application
  const options = {
    hostname: '127.0.0.1',
    port: REAL_APP_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  log(`Proxying request: ${req.method} ${req.url} to main application`);
  
  // Create the proxy request
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  // Handle proxy errors
  proxyReq.on('error', (e) => {
    log(`Proxy error: ${e.message}`);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'error',
      message: 'Error proxying to main application',
      error: e.message
    }));
  });

  // If there's request data, pipe it to the proxy request
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    req.pipe(proxyReq, { end: true });
  } else {
    proxyReq.end();
  }
});

// Helper function to determine if a request is a health check
function isHealthCheck(req) {
  const userAgent = req.headers['user-agent'] || '';
  return userAgent.toLowerCase().includes('health') || 
         userAgent.includes('curl') || 
         (req.headers['accept'] && !req.headers['accept'].includes('text/html'));
}

// Start the proxy server
proxy.listen(PORT, '0.0.0.0', () => {
  log(`Proxy server listening on port ${PORT}`);
  if (IS_PRODUCTION) {
    log(`Main application running on internal port ${REAL_APP_PORT}`);
    log(`All requests will be proxied to the main application except for health checks`);
  } else {
    log(`DEVELOPMENT MODE: Only the health check endpoint is available`);
  }
});
