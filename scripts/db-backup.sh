#!/bin/bash

# Database backup script for TeamKick Soccer Manager
# Author: TeamKick Development Team
# Date: May 3rd, 2025
#
# This script creates automated backups of the PostgreSQL database
# It can be scheduled using cron to run daily, weekly, or on any desired schedule
# Example cron entry for daily backups at 2am:
# 0 2 * * * /path/to/scripts/db-backup.sh daily
#
# Usage: ./db-backup.sh [daily|weekly|monthly|manual]

# Define colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration variables
BACKUP_ROOT="./database-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_TYPE=${1:-"manual"}
MAX_BACKUPS_DAILY=7     # Keep last 7 daily backups
MAX_BACKUPS_WEEKLY=4    # Keep last 4 weekly backups
MAX_BACKUPS_MONTHLY=12  # Keep last 12 monthly backups
MAX_BACKUPS_MANUAL=5    # Keep last 5 manual backups

# Database connection details (from environment variables)
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set.${NC}"
    exit 1
fi

# Extract database details from DATABASE_URL
# Assuming format: postgres://username:password@hostname:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\).*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Create backup directories based on type
case $BACKUP_TYPE in
    "daily")
        BACKUP_DIR="$BACKUP_ROOT/daily"
        MAX_BACKUPS=$MAX_BACKUPS_DAILY
        ;;
    "weekly")
        BACKUP_DIR="$BACKUP_ROOT/weekly"
        MAX_BACKUPS=$MAX_BACKUPS_WEEKLY
        ;;
    "monthly")
        BACKUP_DIR="$BACKUP_ROOT/monthly"
        MAX_BACKUPS=$MAX_BACKUPS_MONTHLY
        ;;
    "manual")
        BACKUP_DIR="$BACKUP_ROOT/manual"
        MAX_BACKUPS=$MAX_BACKUPS_MANUAL
        ;;
    *)
        echo -e "${RED}Error: Unknown backup type '$BACKUP_TYPE'. Use daily, weekly, monthly, or manual.${NC}"
        exit 1
        ;;
esac

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Backup filename
BACKUP_FILENAME="${DB_NAME}_${BACKUP_TYPE}_${TIMESTAMP}.sql"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILENAME"

# Compression options
COMPRESSION="gzip"  # Options: gzip, bzip2, xz, none
case $COMPRESSION in
    "gzip")
        COMPRESS_CMD="gzip"
        EXTENSION=".gz"
        ;;
    "bzip2")
        COMPRESS_CMD="bzip2"
        EXTENSION=".bz2"
        ;;
    "xz")
        COMPRESS_CMD="xz"
        EXTENSION=".xz"
        ;;
    "none")
        COMPRESS_CMD="cat"
        EXTENSION=""
        ;;
    *)
        echo -e "${YELLOW}Warning: Unknown compression method '$COMPRESSION'. Using gzip.${NC}"
        COMPRESS_CMD="gzip"
        EXTENSION=".gz"
        ;;
esac

# Print backup information
echo -e "${BLUE}=== TeamKick Soccer Manager - Database Backup ===${NC}"
echo -e "${YELLOW}Type: ${BACKUP_TYPE}${NC}"
echo -e "${YELLOW}Database: ${DB_NAME}${NC}"
echo -e "${YELLOW}Backup path: ${BACKUP_PATH}${EXTENSION}${NC}"
echo

# Perform the database backup
echo -e "${BLUE}Starting backup...${NC}"
export PGPASSWORD=$DB_PASS
if pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME | $COMPRESS_CMD > "${BACKUP_PATH}${EXTENSION}"; then
    echo -e "${GREEN}Backup completed successfully!${NC}"
    echo -e "${BLUE}Backup saved to: ${BACKUP_PATH}${EXTENSION}${NC}"
else
    echo -e "${RED}Error: Backup failed!${NC}"
    exit 1
fi

# Clean up old backups, keeping only the most recent ones
echo -e "${BLUE}Cleaning up old backups...${NC}"
OLD_BACKUPS=$(ls -t "${BACKUP_DIR}"/*"${EXTENSION}" 2>/dev/null | tail -n +$((MAX_BACKUPS+1)))
if [ -n "$OLD_BACKUPS" ]; then
    echo -e "${YELLOW}Removing old backups:${NC}"
    for BACKUP in $OLD_BACKUPS; do
        echo -e "${YELLOW}- ${BACKUP}${NC}"
        rm "$BACKUP"
    done
    echo -e "${GREEN}Old backups removed.${NC}"
else
    echo -e "${BLUE}No old backups to remove.${NC}"
fi

# Set executable permission on the created backup (optional)
chmod 600 "${BACKUP_PATH}${EXTENSION}"

echo -e "${GREEN}Backup process completed successfully!${NC}"
echo -e "${BLUE}=== Backup Summary ===${NC}"
echo -e "${YELLOW}Backup type: ${BACKUP_TYPE}${NC}"
echo -e "${YELLOW}Database: ${DB_NAME}${NC}"
echo -e "${YELLOW}Backup file: ${BACKUP_PATH}${EXTENSION}${NC}"
echo -e "${YELLOW}File size: $(du -h "${BACKUP_PATH}${EXTENSION}" | cut -f1)${NC}"
echo -e "${YELLOW}Timestamp: $(date)${NC}"