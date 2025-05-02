#!/bin/bash
# Production deployment script for TeamKick

# Set error handling
set -e

# Display banner
echo "====================================="
echo "TeamKick Production Deployment Script"
echo "====================================="
echo ""

# 1. Validate environment variables
echo "Step 1: Validating environment variables..."
node scripts/validate-env.js
if [ $? -ne 0 ]; then
  echo "❌ Environment validation failed. Fix the issues above before deploying."
  exit 1
fi
echo "✅ Environment validation successful."
echo ""

# 2. Run TypeScript checks
echo "Step 2: Running TypeScript checks..."
npm run check
if [ $? -ne 0 ]; then
  echo "❌ TypeScript check failed. Fix the type errors before deploying."
  exit 1
fi
echo "✅ TypeScript check successful."
echo ""

# 3. Build the application
echo "Step 3: Building the application..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed. Fix the build errors before deploying."
  exit 1
fi
echo "✅ Build successful."
echo ""

# 4. Copy public files to dist
echo "Step 4: Copying public files to dist..."
mkdir -p dist/public
cp -r public/* dist/public/
echo "✅ Public files copied."
echo ""

# 5. Run database migrations
echo "Step 5: Running database migrations..."
npm run db:push
if [ $? -ne 0 ]; then
  echo "❌ Database migration failed. Check your database connection and schema."
  exit 1
fi
echo "✅ Database migration successful."
echo ""

# 6. Run deployment verification
echo "Step 6: Running deployment verification..."
node scripts/deploy.js
if [ $? -ne 0 ]; then
  echo "❌ Deployment verification failed. Fix the issues before proceeding."
  exit 1
fi
echo "✅ Deployment verification successful."
echo ""

# 7. Done
echo "====================================="
echo "✅ Deployment preparation complete!"
echo "====================================="
echo ""
echo "To start the application in production mode, run:"
echo "NODE_ENV=production node dist/index.js"
echo ""
echo "Or use the Replit deployment feature from the Deployment tab."

exit 0