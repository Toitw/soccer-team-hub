# Production Deployment Guide

This guide provides step-by-step instructions for deploying the application to production environments while avoiding common issues that cause 5XX errors.

## Pre-Deployment Checklist

Before deploying to production, ensure the following:

1. **Database Configuration**
   - Ensure the PostgreSQL database is properly set up and accessible
   - Verify the `DATABASE_URL` environment variable is correctly set in your production environment
   - Run `scripts/prepare-for-deploy.sh` to verify database connection and set up required tables

2. **Environment Variables**
   - Set `NODE_ENV=production` in your production environment
   - Configure any API keys or secrets required by the application
   - Ensure all required environment variables are defined

3. **Build Process**
   - Run `npm run build` to create production-optimized builds of both client and server
   - Verify the build process completes without errors

## Deployment Steps

Follow these steps to deploy the application to production:

1. **Run Pre-Deployment Script**
   ```bash
   ./scripts/prepare-for-deploy.sh
   ```
   This script will:
   - Verify database connection
   - Create required tables (sessions)
   - Build the application for production
   - Run basic verification checks

2. **Start the Production Server**
   ```bash
   NODE_ENV=production node dist/index.js
   ```

3. **Verify Deployment**
   - Check the server logs for any startup errors
   - Visit the application URL and verify it loads correctly
   - Test the `/api/health` endpoint to ensure all systems are operational

## Troubleshooting 5XX Errors

If you encounter 5XX errors in production, follow these troubleshooting steps:

1. **Check Server Logs**
   - Review the server logs for any error messages or exceptions
   - Look for logs in the `logs/production-errors.log` file
   
2. **Verify Database Connection**
   - Ensure the database is accessible from your production environment
   - Check that the database connection string is correct
   - Verify the database user has the necessary permissions

3. **Check Application Health**
   - Visit the `/api/health` endpoint to get diagnostic information
   - For detailed diagnostics, check the `/api/diagnostic` endpoint

4. **Common Issues and Solutions**

   | Problem | Solution |
   |---------|----------|
   | Database connection failures | Verify DATABASE_URL and network connectivity |
   | Session persistence issues | Ensure the sessions table exists in the database |
   | Memory leaks | Check for increasing memory usage in the health endpoint |
   | Server startup failures | Check logs for initialization errors |
   | Client-side 5XX errors | Verify the server is running and accessible |

5. **Recovery Process**

   If the application is in a broken state:
   
   - Stop the current process
   - Run the database check script: `node scripts/ensure-sessions-table.js`
   - Restart the application: `NODE_ENV=production node dist/index.js`

## Security Considerations for Production

1. **CORS Configuration**
   - Once the application is stable, update the CORS settings in `server/index.ts` to use a stricter configuration
   - Uncomment the stricter CORS configuration and specify allowed origins

2. **Cookie Security**
   - Update cookie settings to use `secure: true` for all cookies in production
   - Set appropriate `sameSite` cookie policy

3. **Rate Limiting**
   - Adjust rate limiting settings in `server/index.ts` based on your expected traffic

## Monitoring in Production

1. **Health Checks**
   - Set up regular monitoring of the `/api/health` endpoint
   - Configure alerts for any critical failures

2. **Error Tracking**
   - Review `logs/production-errors.log` regularly
   - Set up log rotation to prevent disk space issues

3. **Database Monitoring**
   - Monitor database connection pool health
   - Check for slow queries or connection issues

---

By following this guide, you should be able to deploy the application to production while avoiding common issues that cause 5XX errors.