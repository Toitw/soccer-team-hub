#!/bin/bash
# Deployment script for the application

# Set environment to production
export NODE_ENV=production

# Ensure sessions table exists before starting the application
node scripts/ensure-sessions-table.js

# Start the application
node dist/index.js