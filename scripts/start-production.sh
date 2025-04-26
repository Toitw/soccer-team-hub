#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting application in production mode...${NC}"

# Check if production build exists
if [ ! -d "./dist" ]; then
  echo -e "${RED}Error: Production build not found!${NC}"
  echo -e "Please run ./scripts/build-production.sh first."
  exit 1
fi

# Check if client/dist exists
if [ ! -d "./client/dist" ]; then
  echo -e "${RED}Error: Frontend build not found!${NC}"
  echo -e "Please run ./scripts/build-production.sh first."
  exit 1
fi

# Start the server in production mode
echo -e "${GREEN}Starting server...${NC}"
NODE_ENV=production node dist/index.js