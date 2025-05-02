/**
 * Standalone root path health check handler for Replit deployments
 * 
 * This is a minimal HTTP server that responds to requests at the root path (/)
 * with a 200 OK status. It's designed to handle Replit deployment health checks.
 * 
 * IMPORTANT: Run this with NODE_ENV=production node root-health-handler.js
 */

const http = require('http');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  // Only handle requests to the root path
  if (req.url === '/') {
    console.log(`[${new Date().toISOString()}] Health check request from: ${req.headers['user-agent'] || 'unknown'}`);
    
    // Send a simple JSON response
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'X-Health-Check': 'replit-deployment'
    });
    
    res.end(JSON.stringify({
      status: 'ok',
      message: 'TeamKick API is running',
      timestamp: new Date().toISOString()
    }));
  } else {
    // For any other path, return a 404
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Get the port from environment variable or use default
const PORT = process.env.PORT || 5000;

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Health check server running on port ${PORT}`);
});