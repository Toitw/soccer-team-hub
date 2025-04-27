#!/bin/bash

# Script to prepare the application for production deployment
# This script checks the database, sets up required tables,
# and runs other pre-deployment verification

echo "===== Starting pre-deployment checks ====="

# Step 1: Check environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set"
  echo "Please set this variable before deploying"
  exit 1
fi

echo "✓ Environment variables validated"

# Step 2: Run database setup script
echo "Checking database setup and creating required tables..."
node scripts/ensure-sessions-table.js

if [ $? -ne 0 ]; then
  echo "ERROR: Database setup failed. See logs for details."
  exit 1
fi

echo "✓ Database setup completed"

# Step 3: Build the application
echo "Building the application for production..."
npm run build

if [ $? -ne 0 ]; then
  echo "ERROR: Build failed. See logs for details."
  exit 1
fi

echo "✓ Application built successfully"

# Step 4: Run quick verification tests
echo "Running verification tests..."

# Check if the built server file exists
if [ ! -f "dist/index.js" ]; then
  echo "ERROR: Server build file not found"
  exit 1
fi

# Check if client build directory exists
if [ ! -d "client/dist" ]; then
  echo "ERROR: Client build directory not found"
  exit 1
fi

echo "✓ Verification checks passed"

# Final confirmation
echo "===== Pre-deployment checks completed successfully ====="
echo "The application is ready for deployment!"
echo ""
echo "To deploy, run: NODE_ENV=production node dist/index.js"
echo ""

exit 0