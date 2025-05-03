#!/bin/bash

# Database Migration Runner
# This script runs the TypeScript migration script to migrate data from files to database

# Set environment variables if needed (if not already set in the environment)
# export DATABASE_URL="postgres://username:password@hostname:port/database"

echo "Starting the migration process..."

# Compile and run the migration script
npx tsx scripts/db-migrate-data.ts

# Check if migration was successful
if [ $? -eq 0 ]; then
  echo "Migration completed successfully"
else
  echo "Migration failed"
  exit 1
fi

exit 0