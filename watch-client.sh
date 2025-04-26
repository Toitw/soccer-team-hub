#!/bin/bash

# This script watches for changes in the client directory and rebuilds the client automatically
# Needs to be run in a separate terminal while the application is running

echo "👀 Watching for changes in client directory..."

# Set initial timestamp
LAST_BUILD=$(date +%s)

# Function to build the client
build_client() {
  echo "🔄 Changes detected, rebuilding client..."
  # Build the application and copy files to server/public
  ./autobuild.sh
  LAST_BUILD=$(date +%s)
  echo "👀 Continuing to watch for changes..."
}

# Watch loop
while true; do
  # Find the newest file in the client directory
  NEWEST=$(find client -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.html" | xargs stat --format '%Y %n' 2>/dev/null | sort -nr | head -n 1 | cut -d' ' -f1)
  
  # If there's a newer file than our last build, rebuild
  if [[ -n "$NEWEST" && "$NEWEST" -gt "$LAST_BUILD" ]]; then
    build_client
  fi
  
  # Sleep for a bit to avoid high CPU usage
  sleep 2
done