#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting production build process...${NC}"

# Step 1: Build the frontend
echo -e "${GREEN}Building the frontend...${NC}"
npx vite build -c vite.config.ts --outDir client/dist

# Step 2: Build the server
echo -e "${GREEN}Building the server...${NC}"
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo -e "${GREEN}Production build complete!${NC}"
echo -e "${YELLOW}To start the production server, run:${NC}"
echo "NODE_ENV=production node dist/index.js"