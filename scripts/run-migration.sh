#!/bin/bash

# Database Migration Script Runner
# This script runs the database migration, with error handling and backup

# Check if the database exists and has tables
echo "Checking database connection..."
if ! npx tsx scripts/db-health.ts > /dev/null; then
  echo "Database connection failed. Please check your database configuration."
  exit 1
fi

# Create a backup before migration (optional but recommended)
BACKUP_DIR="./data/backups"
mkdir -p $BACKUP_DIR

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pre_migration_backup_$TIMESTAMP.sql"

echo "Creating database backup before migration..."
pg_dump $DATABASE_URL > $BACKUP_FILE
if [ $? -ne 0 ]; then
  echo "Warning: Database backup failed. Consider running manual backup before proceeding."
  read -p "Continue with migration anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 1
  fi
fi

# Run the migration script
echo "Running database migration..."
npx tsx scripts/db-migrate-data.ts

# Check if migration was successful
if [ $? -eq 0 ]; then
  echo "Migration completed successfully!"
  
  # Perform integrity check
  echo "Performing database integrity check..."
  npx tsx scripts/db-health.ts
else
  echo "Migration failed. Consider restoring from backup."
  echo "Backup file: $BACKUP_FILE"
  
  # Instructions for manual restore
  echo "To restore from backup, run:"
  echo "psql $DATABASE_URL < $BACKUP_FILE"
  
  exit 1
fi

echo "Migration process completed."