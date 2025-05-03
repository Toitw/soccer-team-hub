#!/bin/bash

# Color definitions for output formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== TeamKick Soccer Manager - Database Migration Tool ===${NC}"
echo -e "This tool will migrate your data from the file-based storage to PostgreSQL."
echo -e "A backup of your data will be created before migration."
echo

# Check if database is accessible before proceeding
echo -e "${BLUE}Checking database connection...${NC}"

# Create a simple Node.js script to test the database connection
cat > test-db-connection.mjs << 'EOF'
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure Neon client with WebSocket support for Replit
neonConfig.webSocketConstructor = ws;

// Use the DATABASE_URL environment variable
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const res = await pool.query('SELECT 1 AS health_check');
  if (res.rows[0].health_check === 1) {
    console.log('Database connection successful!');
    process.exit(0);
  } else {
    console.error('Database health check failed');
    process.exit(1);
  }
} catch (err) {
  console.error('Database connection failed:', err);
  process.exit(1);
}
EOF

# Run the test script
if ! node test-db-connection.mjs; then
  echo -e "${RED}Error: Unable to connect to the database. Please check your DATABASE_URL environment variable.${NC}"
  rm test-db-connection.mjs
  exit 1
fi

rm test-db-connection.mjs
echo -e "${GREEN}Database connection successful!${NC}"
echo

# Ask for confirmation before proceeding
echo -e "${YELLOW}Warning: This operation will attempt to preserve existing data, but it's recommended to have a backup.${NC}"
read -p "Do you want to proceed with the migration? (y/n): " confirmation
if [[ $confirmation != "y" && $confirmation != "Y" ]]; then
  echo -e "${BLUE}Migration cancelled.${NC}"
  exit 0
fi

echo
echo -e "${BLUE}Starting migration process...${NC}"

# Create a timestamped backup directory
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="data-backup/pre-migration_$TIMESTAMP"
mkdir -p $BACKUP_DIR

# Backup the current data directory
echo -e "${BLUE}Creating backup of existing data...${NC}"
if [ -d "data" ]; then
  cp -r data/* $BACKUP_DIR/
  echo -e "${GREEN}Backup created in $BACKUP_DIR${NC}"
else
  echo -e "${YELLOW}No data directory found, skipping backup.${NC}"
fi

# Run the TypeScript migration script
echo -e "${BLUE}Running database migration...${NC}"
echo -e "${YELLOW}This may take a few minutes depending on the amount of data.${NC}"
echo

# Run the migration script with NODE_ENV set to development to avoid production mode restrictions
NODE_ENV=development npx tsx scripts/run-migration.ts

# Check if migration was successful
if [ $? -eq 0 ]; then
  echo
  echo -e "${GREEN}Migration completed successfully!${NC}"
  echo -e "${BLUE}Your data has been migrated to the PostgreSQL database.${NC}"
  echo -e "${BLUE}A backup of your pre-migration data is available in: ${YELLOW}$BACKUP_DIR${NC}"
else
  echo
  echo -e "${RED}Migration failed. Please check the error messages above.${NC}"
  echo -e "${BLUE}Your original data remains unchanged, and a backup is available in: ${YELLOW}$BACKUP_DIR${NC}"
  exit 1
fi

echo
echo -e "${BLUE}=== Migration Process Complete ===${NC}"
echo