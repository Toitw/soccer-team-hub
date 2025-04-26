#!/bin/bash

# This script handles automatic building and running the development server
set -e

echo "🏗️ Building client assets..."
./autobuild.sh

echo "🚀 Starting development server..."
npm run dev