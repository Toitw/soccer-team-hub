# TeamKick Soccer Manager - Database Migration Guide

This document provides instructions for migrating data from the file-based storage system to PostgreSQL database and setting up an automated backup solution.

## Prerequisites

- PostgreSQL database is set up (provided by Replit)
- Environment variables are configured with database credentials
- Node.js and npm are installed

## Migration Process

### Step 1: Check Database Connection

Ensure your PostgreSQL database is accessible and properly configured. You can verify this by checking the application logs when it starts up - it should show "Database connection verified - database is healthy".

### Step 2: Run the Migration Script

The migration script will transfer all your data from JSON files to the PostgreSQL database. It automatically creates a backup of your data before migration in case you need to revert.

```bash
# Make the script executable (if needed)
chmod +x scripts/run-migration.sh

# Run the migration
./scripts/run-migration.sh
```

During migration:
- The script will check database connectivity
- Ask for confirmation before proceeding
- Create a backup of your data
- Migrate all entities to the database
- Report progress and any issues encountered

### Step 3: Verify Migration

After migration completes:
1. Check that your application still functions correctly
2. Verify users can log in and access their data
3. Confirm teams, matches, and other data are present and accurate

## Database Backup System

An automated backup system is provided to regularly back up your PostgreSQL database.

### Running Manual Backups

```bash
# Make the script executable (if needed)
chmod +x scripts/db-backup.sh

# Run a manual backup
./scripts/db-backup.sh manual
```

### Scheduling Automated Backups

For regular backups, you can schedule the script using cron:

```bash
# Example for daily backups at 2 AM
0 2 * * * /path/to/scripts/db-backup.sh daily

# Example for weekly backups on Sunday at 3 AM
0 3 * * 0 /path/to/scripts/db-backup.sh weekly

# Example for monthly backups on the 1st at 4 AM
0 4 1 * * /path/to/scripts/db-backup.sh monthly
```

### Backup Retention

The backup system automatically manages retention based on backup type:
- Daily backups: Last 7 days retained
- Weekly backups: Last 4 weeks retained
- Monthly backups: Last 12 months retained
- Manual backups: Last 5 manual backups retained

### Backup Location

Backups are stored in the `database-backups` directory, organized by type:
- `database-backups/daily/`
- `database-backups/weekly/`
- `database-backups/monthly/`
- `database-backups/manual/`

Each backup is compressed using gzip and includes a timestamp in the filename.

## Troubleshooting

If you encounter issues during migration:

1. **Database Connection Errors:**
   - Verify DATABASE_URL environment variable is correctly set
   - Check if the database server is running
   - Ensure proper access permissions are configured

2. **Migration Failures:**
   - Check the console for specific error messages
   - Verify data integrity in the source JSON files
   - The pre-migration backup can be used to restore data

3. **Post-Migration Issues:**
   - Verify the schema matches expected structure
   - Check for data type conversion issues
   - Ensure proper indexes are created for optimal performance

For persistent issues, you may need to restore from backup and retry the migration after resolving the specific problem.

## Reverting to File Storage (Emergency Only)

In an emergency situation where you need to revert to file-based storage:

1. Edit `server/index.ts` to use MemStorage instead of DatabaseStorage
2. Copy your backed-up data files back to the `data` directory
3. Restart the application

This should be considered a temporary solution until database issues are resolved.