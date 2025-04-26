#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting automatic build process..."

# Build the app using the existing npm script
npm run build

# Create server/public directory if it doesn't exist
mkdir -p server/public

# Copy all files from dist/public to server/public
echo "📂 Copying files from dist/public to server/public..."
cp -r dist/public/* server/public/

echo "✅ Build completed successfully"