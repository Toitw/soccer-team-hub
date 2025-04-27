# Production Deployment Guide

This document outlines the steps to deploy the application to production environments and details the solutions implemented to address common deployment issues.

## Deployment Process

1. Ensure all code is committed to version control
2. Run database migrations using `npm run db:push`
3. Build the client application using `npm run build`
4. Deploy to the hosting platform (Cloud Run, etc.)

## Health Check Configuration

### Health Check Endpoints

The application provides the following health check endpoints:

| Endpoint | Purpose | Status Codes |
|----------|---------|--------------|
| `/` | Root health check (used by Cloud Run) | 200 OK |
| `/healthz` | Standard Kubernetes health check | 200 OK |
| `/api/health` | Detailed application health information | 200 OK / 500 Error |

### Health Response

All health endpoints return a JSON response that includes:

```json
{
  "status": "ok",
  "service": "team-management-app",
  "environment": "production",
  "timestamp": "2025-04-27T19:37:33.105Z",
  "uptime": 25,
  "database": {
    "status": "connected"
  },
  "memory": {
    "rss": "198MB",
    "heapTotal": "75MB",
    "heapUsed": "72MB"
  }
}
```

## Cloud Run Configuration

For Cloud Run deployments, configure the health check to use the `/` endpoint:

```yaml
health_check:
  path: "/"
  timeout_seconds: 5
  initial_delay_seconds: 10
```

## Database Preparation

The application automatically ensures that required database tables (like the sessions table) exist in production environments. This is handled during server startup.

## Common Issues and Solutions

### 5XX Server Errors

If you encounter 5XX errors in production, check the following:

1. **Health Check Failures**: Ensure that the health check endpoints (`/` or `/healthz`) return 200 status codes.
2. **Database Connection Issues**: Check the database connection string and ensure the database is accessible from the deployed environment.
3. **Sessions Table Issues**: Verify the sessions table exists in the database.
4. **Memory/Resource Constraints**: Check if the application is hitting resource limits on the hosting platform.

### CORS Issues

The application is configured with flexible CORS settings for troubleshooting production issues. Once the application is stable, you should tighten these settings in `server/index.ts`.

### SSL/TLS Issues

If using custom domains, ensure that SSL certificates are properly configured on the hosting platform.

## Debugging Production Issues

The application includes built-in diagnostic tools:

1. **Error Logging**: Detailed error logs are captured and stored.
2. **Diagnostic Endpoint**: Access `/api/diagnostic` in production to view recent errors and system state.
3. **Emergency Mode**: If the server fails to start normally, it launches in emergency mode with a minimal server that can report errors.

## Deployment Checklist

- [ ] Database connection is configured with proper credentials
- [ ] Environment variables are set correctly
- [ ] Database tables and schema are up-to-date
- [ ] Static assets are built and included
- [ ] Health check endpoints are working
- [ ] CORS is configured appropriately
- [ ] Rate limiting is configured
- [ ] Session storage is working

## Performance Considerations

- The application is configured to use PostgreSQL for session storage in production
- Express server is configured to handle high traffic with appropriate timeouts and error handling
- The server binds to `0.0.0.0` to ensure it's accessible in containerized environments