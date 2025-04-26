// Simple test script to verify that our production mode static file serving works
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 5001; // Use a different port to avoid conflicts

// Simulate production mode
console.log('Running in simulated production mode');

// Serve static files from client/dist
const staticDir = path.join(__dirname, 'client', 'dist');
app.use(express.static(staticDir));

// Serve the index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Production test server running at http://localhost:${PORT}`);
  console.log(`Serving static files from: ${staticDir}`);
});