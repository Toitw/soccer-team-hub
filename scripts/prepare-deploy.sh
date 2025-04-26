#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting production deployment preparation...${NC}"

# Step 1: Install production dependencies
echo -e "${GREEN}Installing production dependencies...${NC}"
npm ci --production

# Step 2: Build the frontend
echo -e "${GREEN}Building the frontend...${NC}"
cd client
npm run build
cd ..

# Step 3: Ensure database migration is up-to-date
echo -e "${GREEN}Updating database schema...${NC}"
npm run db:push

# Step 4: Create placeholder .env file if one doesn't exist
if [ ! -f .env ]; then
  echo -e "${YELLOW}Creating placeholder .env file...${NC}"
  echo "# Required variables" > .env
  echo "DATABASE_URL=postgres://user:password@localhost:5432/dbname" >> .env
  echo "SESSION_SECRET=replace_this_with_a_very_long_random_string_at_least_32_chars" >> .env
  echo "" >> .env
  echo "# Optional variables" >> .env
  echo "# FRONTEND_URL=https://myapp.example.com" >> .env
  echo "# SENDGRID_API_KEY=your_sendgrid_api_key" >> .env
  echo "# EMAIL_FROM=noreply@example.com" >> .env
  
  echo -e "${RED}IMPORTANT: You must update .env with real values before deploying!${NC}"
else
  echo -e "${GREEN}.env file already exists. Skipping creation.${NC}"
fi

echo -e "${GREEN}Production preparation complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update .env with production values"
echo "2. Set NODE_ENV=production in your hosting environment"
echo "3. Run 'node server/index.js' to start the production server"