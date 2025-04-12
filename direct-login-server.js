const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3500;

// Serve the test login page 
app.get('/', (req, res) => {
  const htmlContent = fs.readFileSync(path.join(__dirname, 'test-login.html'), 'utf8');
  res.send(htmlContent);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Direct login test server running at http://localhost:${PORT}`);
  console.log(`Visit this URL to access the test login form`);
});