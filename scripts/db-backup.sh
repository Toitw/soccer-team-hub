#!/bin/bash
# Script to backup the PostgreSQL database
BACKUP_FILE="backup-$(date +%Y%m%d%H%M%S).sql"
echo "Creating database backup: $BACKUP_FILE"

# Run pg_dump to create backup
pg_dump $DATABASE_URL > $BACKUP_FILE

if [ $? -eq 0 ]; then
  echo "Database backup completed successfully"
  echo "Backup saved to: $BACKUP_FILE"
else
  echo "Error: Database backup failed"
  exit 1
fi