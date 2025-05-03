#!/bin/bash

# Database Backup Script
# Creates a database backup using pg_dump and stores it in a backup directory with timestamp
# Run this script daily via cron job for regular backups

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Print status
echo "Starting database backup..."
echo "Backup file: $BACKUP_FILE"

# Execute database backup
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

# Extract database connection details from DATABASE_URL
if [[ "$DATABASE_URL" =~ postgres://([^:]+):([^@]+)@([^:]+):([^/]+)/([^?]+) ]]; then
  PGUSER="${BASH_REMATCH[1]}"
  PGPASSWORD="${BASH_REMATCH[2]}"
  PGHOST="${BASH_REMATCH[3]}"
  PGPORT="${BASH_REMATCH[4]}"
  PGDATABASE="${BASH_REMATCH[5]}"
  
  # Set environment variables
  export PGUSER PGPASSWORD PGHOST PGPORT PGDATABASE
  
  # Perform backup
  pg_dump --format=c --file="$BACKUP_FILE"
  BACKUP_RESULT=$?
  
  # Check result
  if [ $BACKUP_RESULT -eq 0 ]; then
    echo "Backup completed successfully"
    
    # Calculate backup size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "Backup size: $BACKUP_SIZE"
    
    # Delete old backups (keep last 7 days)
    find "$BACKUP_DIR" -name "db_backup_*.sql" -type f -mtime +7 -delete
    echo "Old backups cleaned up (only keeping last 7 days)"
  else
    echo "ERROR: Database backup failed with exit code $BACKUP_RESULT"
    exit $BACKUP_RESULT
  fi
else
  echo "ERROR: Could not parse DATABASE_URL"
  exit 1
fi

echo "Backup process completed"
exit 0